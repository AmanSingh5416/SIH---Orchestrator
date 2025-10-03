# database.py
import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as aioredis
from loguru import logger
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage, SystemMessage

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
DATABASE_NAME = "HRMS"  # Changed from "SIH" to "HRMS"


# -----------------------------------------------------------
# MongoDB Wrapper
# -----------------------------------------------------------
class MongoDB:
    def __init__(self):
        self.client = None
        self.database = None

    async def connect(self):
        if not self.client:
            logger.info("Connecting to MongoDB...")
            self.client = AsyncIOMotorClient(MONGO_URI)
            self.database = self.client[DATABASE_NAME]
            await self._ensure_indexes()
            logger.info("✅ MongoDB connected.")

    async def disconnect(self):
        if self.client:
            logger.info("Disconnecting MongoDB...")
            self.client.close()
            self.client = None
            self.database = None

    async def _ensure_indexes(self):
        try:
            # Update collection names here too
            await self.database.users.create_index("email", unique=True)
            await self.database.users.create_index("workInfo.skills")
            await self.database.users.create_index("workInfo.department")
            await self.database.projects.create_index("status")
            await self.database.projects.create_index("required_skills")
            await self.database.chat_messages.create_index(
                [("session_id", 1), ("timestamp", -1)]
            )
        except Exception as e:
            logger.warning(f"Index creation error: {e}")

    async def get_all_employees(self, employeeID: str) -> Dict[str, Any]:
        """Get employee by ID and format the response"""
        try:
            # Changed to users collection and correct query
            query = {"workInfo.employeeID": employeeID}
            employee = await self.database.users.find_one(query)  # Changed from employees to users
            
            if not employee:
                logger.warning(f"No employee found with ID: {employeeID}")
                return None
            
            # Format the response to match your data structure
            return {
                "id": str(employee["_id"]),
                "email": employee["email"],
                "role": employee["role"],
                "personalInfo": employee["personalInfo"],
                "workInfo": employee["workInfo"],
                "isActive": employee["isActive"],
                "createdAt": employee["createdAt"],
                "updatedAt": employee["updatedAt"]
            }
        except Exception as e:
            logger.error(f"Error fetching employee: {e}")
            return None

    async def get_all_projects(self) -> List[Dict[str, Any]]:
        return await self.database.projects.find({}).to_list(length=None)

    async def get_employee(self, employeeID: str) -> Optional[Dict[str, Any]]:
        """Get employee details using employeeID"""
        try:
            query = {"workInfo.employeeID": employeeID}
            employee = await self.database.users.find_one(query)  # Changed from employees to users
            return employee
        except Exception as e:
            logger.error(f"Error fetching employee: {e}")
            return None

    async def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        return await self.database.projects.find_one({"_id": project_id})

    async def create_employee(self, employee_obj) -> str:
        """Create new employee document"""
        try:
            data = (
                employee_obj.dict(by_alias=True)
                if hasattr(employee_obj, "dict")
                else dict(employee_obj)
            )
            # Set creation and update timestamps
            data["createdAt"] = datetime.utcnow()
            data["updatedAt"] = datetime.utcnow()
            result = await self.database.users.insert_one(data)  # Changed from employees to users
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error creating employee: {e}")
            return None

    async def create_project(self, project_obj) -> str:
        data = (
            project_obj.dict(by_alias=True)
            if hasattr(project_obj, "dict")
            else dict(project_obj)
        )
        await self.database.projects.insert_one(data)
        return data.get("_id")

    async def get_chat_history(self, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        cursor = (
            self.database.chat_messages.find({"session_id": session_id})
            .sort("timestamp", -1)
            .limit(limit)
        )
        results = await cursor.to_list(length=limit)
        for r in results:
            if isinstance(r.get("timestamp"), datetime):
                r["timestamp"] = r["timestamp"].isoformat()
        return list(reversed(results))

    async def save_chat_message(self, chat_message):
        data = chat_message.dict() if hasattr(chat_message, "dict") else dict(chat_message)
        await self.database.chat_messages.insert_one(data)

    async def get_employee_workload(self, employeeID: str) -> Dict[str, Any]:
        """Get employee workload metrics"""
        try:
            emp = await self.get_employee(employeeID)
            if not emp:
                return {}

            work_info = emp.get("workInfo", {})
            capacity = work_info.get("capacityHours", 40)
            current_projects = work_info.get("currentProjects", [])

            allocated = 0
            for pid in current_projects:
                proj = await self.get_project(pid)
                if not proj:
                    continue
                est = proj.get("estimatedHours", 0)
                team_size = max(1, len(proj.get("teamMembers", [])))
                allocated += est / team_size

            allocated_hours = min(allocated, capacity * 2)
            utilization_percentage = (
                (allocated_hours / capacity) * 100 if capacity > 0 else 0.0
            )

            return {
                "employeeID": work_info.get("employeeID"),
                "name": f"{emp.get('personalInfo', {}).get('firstName', '')} {emp.get('personalInfo', {}).get('lastName', '')}",
                "capacity_hours": capacity,
                "allocated_hours": round(allocated_hours, 2),
                "utilization_percentage": round(utilization_percentage, 2),
                "current_projects": current_projects,
                "department": work_info.get("department"),
                "skills": work_info.get("skills", [])
            }
        except Exception as e:
            logger.error(f"Error calculating workload: {e}")
            return {}

# Remove the direct print statement that caused the coroutine warning
# mongodb = MongoDB()
# print(mongodb.get_all_employees("emp017"))  # Remove this line

# Modified test function
async def test_mongodb():
    try:
        # Create MongoDB instance
        db = MongoDB()
        
        # Initialize and connect
        await db.connect()
        
        # Test with the employee ID we can see in the screenshot
        emp_id = "emp001"
        employee = await db.get_all_employees(emp_id)
        if employee:
            print(f"\nEmployee found with ID {emp_id}:")
            print(json.dumps(employee, indent=2, default=str))
        else:
            print(f"\nNo employee found with ID {emp_id}")
            
        # Disconnect when done
        await db.disconnect()
        
    except Exception as e:
        print(f"Error: {e}")

# Add a test function to verify the updated methods
async def test_all_functions():
    try:
        db = MongoDB()
        await db.connect()
        
        # Test employee lookup
        emp_id = "emp001"
        
        # Test get_employee
        print("\nTesting get_employee:")
        employee = await db.get_employee(emp_id)
        if employee:
            print(f"Found employee: {employee['personalInfo']['firstName']} {employee['personalInfo']['lastName']}")
        
        # Test workload calculation
        print("\nTesting get_employee_workload:")
        workload = await db.get_employee_workload(emp_id)
        print(json.dumps(workload, indent=2))
        
        await db.disconnect()
        
    except Exception as e:
        print(f"Error in tests: {e}")

async def test_user_count():
    try:
        db = MongoDB()
        await db.connect()
        
        # Count users in the database
        count = await db.database.users.count_documents({})
        print(f"\nTotal users in database: {count}")
        
        # # Get a sample user
        # sample_user = await db.database.users.find_one({})
        # print("\nSample user structure:")
        # print(json.dumps(sample_user, indent=2, default=str))
        
        await db.disconnect()
        
    except Exception as e:
        print(f"Error: {e}")

# Add this test function
async def test_gemini():
    try:
        # Initialize Gemini
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            convert_system_message_to_human=True,
            temperature=0.7
        )
        
        # Test basic query
        messages = [
            SystemMessage(content="You are an AI assistant helping with HR tasks."),
            HumanMessage(content="What LLM am I speaking to?")
        ]
        
        print("\nTesting Gemini Integration:")
        print("Sending test message to model...")
        
        response = await llm.ainvoke(messages)
        print("\nGemini Response:")
        print(response.content)
        
        # Test with database info
        db = MongoDB()
        await db.connect()
        
        count = await db.database.users.count_documents({})
        test_msg = f"I have {count} users in my database. Can you help me understand their information?"
        
        messages.append(HumanMessage(content=test_msg))
        response = await llm.ainvoke(messages)
        
        print("\nGemini Response with DB context:")
        print(response.content)
        
        await db.disconnect()
        
    except Exception as e:
        print(f"Error testing Gemini: {e}")

# Run the test
if __name__ == "__main__":
    import asyncio
    asyncio.run(test_gemini())


