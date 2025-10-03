from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from database import mongodb, redis_cache  # Add redis_cache here
from models import (
    Employee, Project, WorkloadMetric, SkillGap,
    TeamRecommendation, ChatMessage, ExperienceLevel, ProjectStatus
)

import os
import json
from dotenv import load_dotenv
from loguru import logger

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import AgentExecutor, create_structured_chat_agent
from langchain.tools import StructuredTool
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema import HumanMessage, AIMessage, SystemMessage
from langchain_core.callbacks import CallbackManager
from langchain_core.callbacks.streaming_stdout import StreamingStdOutCallbackHandler

# -----------------------------------------------------------
# Load env and configure LLM
# -----------------------------------------------------------
load_dotenv()

# Update LLM configuration
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-pro",  
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    convert_system_message_to_human=True,
    temperature=0.7,
    verbose=True
)

# -----------------------------------------------------------
# Tool input schemas
# -----------------------------------------------------------
# Update Tool input schemas to match database models
class EmployeeSearchInput(BaseModel):
    skills: Optional[List[str]] = Field(None, description="List of required skills")
    department: Optional[str] = Field(None, description="Department name (e.g., Engineering, HR)")
    availability: Optional[bool] = Field(None, description="Filter by availability (True/False)")


class ProjectSearchInput(BaseModel):
    status: Optional[str] = Field(None, description="Project status filter")
    priority: Optional[int] = Field(None, ge=1, le=5, description="Minimum priority level (1-5)")


class TeamRecommendationInput(BaseModel):
    project_id: str = Field(description="Project ID to recommend team for")
    required_skills: List[str] = Field(description="Required skills for the project")
    team_size: int = Field(gt=0, description="Desired team size")


class WorkloadAnalysisInput(BaseModel):
    employee_id: Optional[str] = Field(None, description="Specific employee ID (e.g., emp001)")
    threshold: Optional[float] = Field(80, ge=0, le=100, description="Utilization threshold percentage")


# Define tool input schemas
class DatabaseQueryInput(BaseModel):
    query_type: str = Field(description="Type of query (count, search, details)")
    collection: str = Field(description="Collection to query (users, projects)")
    filters: Optional[dict] = Field(default=None, description="Query filters")


# -----------------------------------------------------------
# Tool functions
# -----------------------------------------------------------
# Update tool functions to use the new models
async def search_employees(
    skills: Optional[List[str]] = None,
    department: Optional[str] = None,
    availability: Optional[bool] = None
) -> str:
    try:
        query = {}
        if skills:
            query["workInfo.skills"] = {"$in": skills}
        if department:
            query["workInfo.department"] = department
        
        employees = await mongodb.database.users.find(query).to_list(length=100)
        if availability is not None:
            filtered = []
            for emp in employees:
                workload = await mongodb.get_employee_workload(emp["workInfo"]["employeeID"])
                is_available = workload["utilization_percentage"] < 80
                if availability == is_available:
                    filtered.append(emp)
            employees = filtered
            
        result = [{
            "id": str(emp["_id"]),
            "name": f"{emp['personalInfo']['firstName']} {emp['personalInfo']['lastName']}",
            "skills": emp["workInfo"]["skills"],
            "department": emp["workInfo"]["department"],
            "current_projects": emp["workInfo"].get("currentProjects", [])
        } for emp in employees[:10]]
        return json.dumps(result, indent=2)
    except Exception as e:
        logger.error(f"Error searching employees: {e}")
        return f"Error: {e}"


async def get_project_details(
    project_id: str = None,
    status: Optional[ProjectStatus] = None,
    priority: Optional[int] = None
) -> str:
    try:
        if project_id:
            project = await mongodb.get_project(project_id)
            if project:
                return Project(**project).json(indent=2)
            return f"Project {project_id} not found"

        query = {}
        if status:
            query["status"] = status
        if priority:
            query["priority"] = {"$gte": priority}

        projects = await mongodb.database.projects.find(query).to_list(length=20)
        result = [Project(**proj).dict() for proj in projects[:10]]
        return json.dumps(result, indent=2)
    except Exception as e:
        logger.error(f"Error getting project details: {e}")
        return f"Error: {e}"


async def recommend_team(project_id: str,
                         required_skills: List[str],
                         team_size: int) -> str:
    try:
        all_employees = await mongodb.get_all_employees()
        scored = []

        for emp in all_employees:
            skill_match = len(set(emp["skills"]) & set(required_skills))
            if skill_match == 0:
                continue

            workload = await mongodb.get_employee_workload(emp["_id"])
            availability_score = max(0, 100 - workload["utilization_percentage"]) / 100
            total_score = (skill_match / len(required_skills)) * 0.7 + availability_score * 0.3

            scored.append({
                "employee": emp,
                "score": total_score,
                "matched_skills": list(set(emp["skills"]) & set(required_skills)),
                "availability": availability_score
            })

        scored.sort(key=lambda x: x["score"], reverse=True)
        recommended = scored[:team_size]

        recommendation = {
            "project_id": project_id,
            "recommended_team": [{
                "id": m["employee"]["_id"],
                "name": m["employee"]["name"],
                "skills": m["matched_skills"],
                "match_score": round(m["score"], 2),
                "availability": f"{m['availability']*100:.0f}%"
            } for m in recommended],
            "overall_match_score": round(sum(m["score"] for m in recommended) / len(recommended), 2) if recommended else 0,
            "reasoning": f"Selected {len(recommended)} team members based on skill match and availability"
        }
        return json.dumps(recommendation, indent=2)
    except Exception as e:
        logger.error(f"Error recommending team: {e}")
        return f"Error: {e}"


async def analyze_workload(
    employee_id: Optional[str] = None,
    threshold: float = 80
) -> str:
    try:
        if employee_id:
            workload = await mongodb.get_employee_workload(employee_id)
            if not workload:
                return f"Employee {employee_id} not found"
                
            metric = WorkloadMetric(
                employeeID=employee_id,
                name=workload["name"],
                capacity_hours=workload["capacity_hours"],
                allocated_hours=workload["allocated_hours"],
                utilization_percentage=workload["utilization_percentage"],
                current_projects=workload["current_projects"],
                department=workload["department"],
                skills=workload["skills"]
            )
            return metric.json(indent=2)

        all_emps = await mongodb.get_all_employees()
        at_risk = []
        for emp in all_emps:
            workload = await mongodb.get_employee_workload(emp["_id"])
            if workload["utilization_percentage"] > threshold:
                at_risk.append({
                    "id": emp["_id"],
                    "name": emp["name"],
                    "utilization": f"{workload['utilization_percentage']:.1f}%",
                    "projects": len(workload["current_projects"])
                })

        result = {
            "threshold": f"{threshold}%",
            "at_risk_count": len(at_risk),
            "at_risk_employees": at_risk[:10]
        }
        return json.dumps(result, indent=2)
    except Exception as e:
        logger.error(f"Error analyzing workload: {e}")
        return f"Error: {e}"


async def identify_skill_gaps() -> str:
    try:
        projects = await mongodb.get_all_projects()
        employees = await mongodb.get_all_employees()

        required = {}
        for proj in projects:
            if proj.get("status") in ["Planning", "In Progress"]:
                for s in proj["required_skills"]:
                    required[s] = required.get(s, 0) + 1

        available = {}
        for emp in employees:
            for s in emp["skills"]:
                available[s] = available.get(s, 0) + 1

        gaps = []
        for skill, req in required.items():
            avail = available.get(skill, 0)
            gap = req - avail
            if gap > 0:
                gaps.append({
                    "skill": skill,
                    "required": req,
                    "available": avail,
                    "gap": gap,
                    "criticality": "High" if gap >= 3 else "Medium" if gap >= 1 else "Low",
                    "action": f"Need to hire or train {gap} more {skill} professionals"
                })

        gaps.sort(key=lambda x: x["gap"], reverse=True)
        return json.dumps(gaps[:10], indent=2)
    except Exception as e:
        logger.error(f"Error identifying skill gaps: {e}")
        return f"Error: {e}"


# -----------------------------------------------------------
# Dummy Data System
# -----------------------------------------------------------
DUMMY_RESPONSES = {
    "how many user in the database": "There are currently 15 users in the database.",
    "what is the total number of users in the database": "There are currently 15 users in the database.",
    "how many employees are there": "Currently, there are 15 employees in the system.",
    "show me employees with hr skills": """Found 3 employees with HR skills:
1. John Doe - HR Manager
2. Jane Smith - HR Specialist
3. Bob Wilson - HR Associate""",
    "which employee has risk for burnout": """Found 5 employees at risk for burnout:
1. Neha Gupta - UX Designer""",

}

class DummyOrchestratorAgent:
    def __init__(self):
        self.llm = llm
        self.tools = tools

    async def process_message(self, session_id: str, message: str) -> str:
        try:
            # Convert message to lowercase for case-insensitive matching
            message_lower = message.lower()
            
            # Check if we have a dummy response for this message
            for key, response in DUMMY_RESPONSES.items():
                if key in message_lower:
                    return response
            
            # Default response if no match is found
            return """I understand you're asking about the database, but I don't have a specific answer for that query.
Here are some questions you can try:
- How many users in the database?
- Show me employees with HR skills
- Who are the employees in Hyderabad?"""

        except Exception as e:
            logger.error(f"Error in process_message: {e}")
            return "⚠️ Sorry, I encountered an error while processing your request."

    async def clear_session(self, session_id: str):
        return True

async def query_database(
    query_type: str,
    collection: str,
    filters: Optional[dict] = None
) -> str:
    """Query the database for information about employees or projects"""
    try:
        if collection == "users":
            if query_type == "count":
                count = await mongodb.database.users.count_documents(filters or {})
                return f"There are {count} users in the database."
            elif query_type == "search":
                users = await mongodb.database.users.find(filters or {}).to_list(length=10)
                return json.dumps([{
                    "name": f"{u['personalInfo']['firstName']} {u['personalInfo']['lastName']}",
                    "department": u['workInfo']['department'],
                    "skills": u['workInfo'].get('skills', []),
                    "location": u['personalInfo']['location']
                } for u in users], indent=2)
        elif collection == "projects":
            if query_type == "count":
                count = await mongodb.database.projects.count_documents(filters or {})
                return f"There are {count} active projects in the database."
            elif query_type == "search":
                projects = await mongodb.database.projects.find(filters or {}).to_list(length=10)
                return json.dumps([{
                    "name": p.get('name'),
                    "status": p.get('status'),
                    "required_skills": p.get('required_skills', [])
                } for p in projects], indent=2)
        return "Please specify a valid query type and collection."
    except Exception as e:
        logger.error(f"Error querying database: {e}")
        return f"Error: {e}"

# -----------------------------------------------------------
# LangChain Tools
# -----------------------------------------------------------
tools = [
    StructuredTool.from_function(search_employees, name="search_employees", description="Find employees by filters"),
    StructuredTool.from_function(get_project_details, name="get_project_details", description="Get/search project info"),
    StructuredTool.from_function(recommend_team, name="recommend_team", description="Suggest team for a project"),
    StructuredTool.from_function(analyze_workload, name="analyze_workload", description="Check workload/burnout risks"),
    StructuredTool.from_function(identify_skill_gaps, name="identify_skill_gaps", description="Identify skill gaps"),
    StructuredTool(
        name="query_database",
        description="Query the database for information about employees or projects",
        func=query_database,
        args_schema=DatabaseQueryInput
    )
]

# -----------------------------------------------------------
# Prompt
# -----------------------------------------------------------
system_prompt = """You are an AI-powered Cognitive Resource Orchestrator assistant. 
Use tools to gather data, then provide clear, actionable, data-driven insights.
Focus on optimal resource allocation and employee wellbeing."""

prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt + "\nAvailable tools: {tools}\nTool names: {tool_names}"),
    MessagesPlaceholder("chat_history"),
    ("human", "{input}"),
    MessagesPlaceholder("agent_scratchpad")
])

# -----------------------------------------------------------
# Chat Memory
# -----------------------------------------------------------
class ChatMemoryManager:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.redis_key = f"chat:{session_id}"

    async def load_history(self) -> List:
        try:
            history = await redis_cache.get(self.redis_key)
            if not history:
                return []
            return [
                HumanMessage(content=msg["content"]) if msg["type"] == "human"
                else AIMessage(content=msg["content"])
                for msg in history
            ]
        except Exception as e:
            logger.error(f"Error loading chat history: {e}")
            return []

    async def save_message(self, type_: str, content: str):
        try:
            history = await redis_cache.get(self.redis_key) or []
            history.append({"type": type_, "content": content})
            await redis_cache.set(self.redis_key, history)
        except Exception as e:
            logger.error(f"Error saving message: {e}")

    async def clear(self):
        try:
            await redis_cache.delete(self.redis_key)
        except Exception as e:
            logger.error(f"Error clearing session {self.session_id}: {e}")


# -----------------------------------------------------------
# Orchestrator Agent
# -----------------------------------------------------------
class OrchestratorAgent:
    def __init__(self):
        self.llm = llm
        self.tools = tools  # Use all defined tools instead of just query_database
        
        self.system_prompt = """You are an AI assistant for HR and employee management.
        You have access to the following tools:
        - search_employees: Find employees by skills or department
        - get_project_details: Get project information
        - recommend_team: Get team recommendations
        - analyze_workload: Check employee workload
        - identify_skill_gaps: Find skill gaps
        - query_database: Direct database queries
        
        Always use these tools to get accurate information."""

    async def process_message(self, session_id: str, message: str) -> str:
        try:
            message_lower = message.lower()
            
            # Handle team recommendation queries
            if "team" in message_lower and ("recommend" in message_lower or "suggestion" in message_lower):
                # Extract multiple skills from the message
                required_skills = []
                message_parts = message_lower.split()
                
                # Common variations of skill names
                skill_mapping = {
                    "react": "React",
                    "python": "Python",
                    "node.js": "Node.js",
                    "nodejs": "Node.js",
                    "java": "Java",
                    "mongodb": "MongoDB"
                }
                
                # Extract skills while handling variations
                for skill_lower, skill_proper in skill_mapping.items():
                    if skill_lower in message_lower:
                        required_skills.append(skill_proper)
                
                if not required_skills:
                    return "Please specify the required skills for the team recommendation."
                
                # Query for employees with any of the required skills
                filters = {"workInfo.skills": {"$in": required_skills}}
                users = await mongodb.database.users.find(filters).to_list(length=None)
                
                if not users:
                    return f"No employees found with the required skills: {', '.join(required_skills)}"
                
                # Group recommendations by skills
                skill_recommendations = {skill: [] for skill in required_skills}
                
                for user in users:
                    user_skills = set(user["workInfo"].get("skills", []))
                    workload = await mongodb.get_employee_workload(user["workInfo"]["employeeID"])
                    availability = 100 - workload.get("utilization_percentage", 0)
                    
                    # Check which required skills this user has
                    for skill in required_skills:
                        if skill in user_skills:
                            score = 0.7 + (availability / 100) * 0.3
                            skill_recommendations[skill].append({
                                "name": f"{user['personalInfo']['firstName']} {user['personalInfo']['lastName']}",
                                "department": user['workInfo']['department'],
                                "skills": list(user_skills),
                                "availability": f"{availability:.1f}%",
                                "score": score
                            })
                
                # Format response for each required skill
                response = "Team recommendations:\n\n"
                for skill in required_skills:
                    candidates = skill_recommendations[skill]
                    if candidates:
                        response += f"For {skill}:\n"
                        # Sort by score and get top candidate
                        candidates.sort(key=lambda x: x["score"], reverse=True)
                        best_match = candidates[0]
                        response += f"- {best_match['name']} ({best_match['department']})\n"
                        response += f"  Skills: {', '.join(best_match['skills'])}\n"
                        response += f"  Availability: {best_match['availability']}\n\n"
                    else:
                        response += f"No candidates found for {skill}\n\n"
                
                return response
            
            # Handle skill-based queries
            if any(word in message_lower for word in ["skill", "skills", "know", "knows", "have", "has"]):
                # Extract skill name (Python, React, etc.)
                words = message_lower.split()
                for i, word in enumerate(words):
                    if word in ["python", "react", "node.js", "java"]:  # Add more skills as needed
                        skill = word
                        filters = {"workInfo.skills": {"$regex": f"^{skill}$", "$options": "i"}}
                        # First get count
                        count = await mongodb.database.users.count_documents(filters)
                        # Then get detailed info
                        users = await mongodb.database.users.find(filters).to_list(length=None)
                        
                        if count > 0:
                            response = f"Found {count} employees with {skill} skills:\n\n"
                            for user in users:
                                name = f"{user['personalInfo']['firstName']} {user['personalInfo']['lastName']}"
                                dept = user['workInfo']['department']
                                response += f"- {name} ({dept})\n"
                            return response
                        else:
                            return f"No employees found with {skill} skills."
            
            # Handle count queries
            if any(phrase in message_lower for phrase in ["how many", "total number", "count"]):
                if "users" in message_lower or "people" in message_lower or "employees" in message_lower:
                    result = await query_database("count", "users")
                    return result
            
            # For general queries, use the LLM
            messages = [
                SystemMessage(content=self.system_prompt),
                HumanMessage(content=message)
            ]
            
            response = await self.llm.ainvoke(messages)
            return response.content
            
        except Exception as e:
            logger.error(f"Error in process_message: {e}")
            return f"⚠️ Sorry, I encountered an error: {str(e)}"

    async def clear_session(self, session_id: str):
        try:
            memory = ChatMemoryManager(session_id)
            await memory.clear()
            return True
        except Exception as e:
            logger.error(f"Error clearing session: {e}")
            return False

# Initialize the agent
orchestrator_agent = OrchestratorAgent()
