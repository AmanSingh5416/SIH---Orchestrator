import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from typing import Optional, List, Dict, Any
from datetime import datetime
import redis.asyncio as redis
from dotenv import load_dotenv
from loguru import logger
from models import Employee, Project, WorkloadMetric, ChatMessage

load_dotenv()

class MongoDB:
    def __init__(self):
        self.client = None
        self.database = None
        
    async def connect(self):
        """Create database connection"""
        try:
            self.client = AsyncIOMotorClient(os.getenv("MONGODB_URI"))
            self.database = self.client[os.getenv("DATABASE_NAME")]
            
            # Create indexes
            await self._create_indexes()
            
            # Initialize with sample data if empty
            await self._initialize_sample_data()
            
            logger.info("Connected to MongoDB")
        except Exception as e:
            logger.error(f"Error connecting to MongoDB: {e}")
            raise
    
    async def disconnect(self):
        """Close database connection"""
        if self.client:
            self.client.close()
            logger.info("Disconnected from MongoDB")
    
    async def _create_indexes(self):
        """Create database indexes for better performance"""
        # Employee indexes
        await self.database.employees.create_index("email", unique=True)
        await self.database.employees.create_index("skills")
        await self.database.employees.create_index("department")
        
        # Project indexes
        await self.database.projects.create_index("status")
        await self.database.projects.create_index("required_skills")
        
        # Chat history indexes
        await self.database.chat_history.create_index([("session_id", 1), ("timestamp", -1)])
    
    async def _initialize_sample_data(self):
        """Initialize database with sample data if empty"""
        employees_count = await self.database.employees.count_documents({})
        
        if employees_count == 0:
            sample_employees = [
                {
                    "_id": "emp001",
                    "name": "Alice Johnson",
                    "email": "alice@company.com",
                    "skills": ["Python", "React", "Machine Learning"],
                    "department": "Engineering",
                    "position": "Senior Developer",
                    "experience_level": "Senior",
                    "current_projects": ["proj001", "proj002"],
                    "capacity_hours": 40,
                    "location": "New York",
                    "performance_score": 4.5,
                    "last_updated": datetime.utcnow()
                },
                {
                    "_id": "emp002",
                    "name": "Bob Smith",
                    "email": "bob@company.com",
                    "skills": ["Java", "Spring", "Docker"],
                    "department": "Engineering",
                    "position": "Lead Developer",
                    "experience_level": "Senior",
                    "current_projects": ["proj001"],
                    "capacity_hours": 40,
                    "location": "San Francisco",
                    "performance_score": 4.2,
                    "last_updated": datetime.utcnow()
                },
                {
                    "_id": "emp003",
                    "name": "Carol Williams",
                    "email": "carol@company.com",
                    "skills": ["UI/UX", "Figma", "React"],
                    "department": "Design",
                    "position": "UI Designer",
                    "experience_level": "Mid",
                    "current_projects": ["proj002", "proj003"],
                    "capacity_hours": 35,
                    "location": "Remote",
                    "performance_score": 4.0,
                    "last_updated": datetime.utcnow()
                },
                {
                    "_id": "emp004",
                    "name": "David Brown",
                    "email": "david@company.com",
                    "skills": ["Project Management", "Agile", "Scrum"],
                    "department": "Management",
                    "position": "Project Manager",
                    "experience_level": "Senior",
                    "current_projects": ["proj001", "proj002", "proj003"],
                    "capacity_hours": 40,
                    "location": "London",
                    "performance_score": 4.7,
                    "last_updated": datetime.utcnow()
                },
                {
                    "_id": "emp005",
                    "name": "Eva Davis",
                    "email": "eva@company.com",
                    "skills": ["Python", "Data Science", "SQL"],
                    "department": "Analytics",
                    "position": "Data Scientist",
                    "experience_level": "Mid",
                    "current_projects": [],
                    "capacity_hours": 40,
                    "location": "Berlin",
                    "performance_score": 4.3,
                    "last_updated": datetime.utcnow()
                }
            ]
            
            sample_projects = [
                {
                    "_id": "proj001",
                    "name": "AI Platform Development",
                    "description": "Building next-gen AI platform",
                    "required_skills": ["Python", "Machine Learning", "Docker"],
                    "team_members": ["emp001", "emp002", "emp004"],
                    "start_date": datetime.utcnow(),
                    "end_date": datetime(2024, 6, 30),
                    "budget": 500000,
                    "status": "In Progress",
                    "priority": 5,
                    "estimated_hours": 2000
                },
                {
                    "_id": "proj002",
                    "name": "Customer Portal Redesign",
                    "description": "Redesigning the customer portal",
                    "required_skills": ["React", "UI/UX", "Figma"],
                    "team_members": ["emp001", "emp003", "emp004"],
                    "start_date": datetime.utcnow(),
                    "end_date": datetime(2024, 4, 30),
                    "budget": 200000,
                    "status": "In Progress",
                    "priority": 4,
                    "estimated_hours": 800
                },
                {
                    "_id": "proj003",
                    "name": "Data Analytics Dashboard",
                    "description": "Creating analytics dashboard",
                    "required_skills": ["Python", "Data Science", "SQL"],
                    "team_members": ["emp003", "emp004"],
                    "start_date": datetime.utcnow(),
                    "end_date": datetime(2024, 5, 31),
                    "budget": 150000,
                    "status": "Planning",
                    "priority": 3,
                    "estimated_hours": 600
                }
            ]
            
            await self.database.employees.insert_many(sample_employees)
            await self.database.projects.insert_many(sample_projects)
            logger.info("Initialized database with sample data")
    
    # Employee CRUD operations
    async def get_all_employees(self) -> List[Dict[str, Any]]:
        cursor = self.database.employees.find({})
        return await cursor.to_list(length=None)
    
    async def get_employee(self, employee_id: str) -> Optional[Dict[str, Any]]:
        return await self.database.employees.find_one({"_id": employee_id})
    
    async def create_employee(self, employee: Employee) -> str:
        result = await self.database.employees.insert_one(employee.dict(by_alias=True))
        return str(result.inserted_id)
    
    async def update_employee(self, employee_id: str, update_data: Dict[str, Any]) -> bool:
        update_data["last_updated"] = datetime.utcnow()
        result = await self.database.employees.update_one(
            {"_id": employee_id},
            {"$set": update_data}
        )
        return result.modified_count > 0
    
    # Project CRUD operations
    async def get_all_projects(self) -> List[Dict[str, Any]]:
        cursor = self.database.projects.find({})
        return await cursor.to_list(length=None)
    
    async def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        return await self.database.projects.find_one({"_id": project_id})
    
    async def create_project(self, project: Project) -> str:
        result = await self.database.projects.insert_one(project.dict(by_alias=True))
        return str(result.inserted_id)
    
    # Workload operations
    async def get_employee_workload(self, employee_id: str) -> Dict[str, Any]:
        employee = await self.get_employee(employee_id)
        if not employee:
            return None
        
        projects = []
        for project_id in employee.get("current_projects", []):
            project = await self.get_project(project_id)
            if project:
                projects.append(project)
        
        total_hours = len(projects) * 10  # Simplified calculation
        utilization = (total_hours / employee.get("capacity_hours", 40)) * 100
        
        return {
            "employee_id": employee_id,
            "name": employee.get("name"),
            "current_projects": projects,
            "total_allocated_hours": total_hours,
            "capacity_hours": employee.get("capacity_hours"),
            "utilization_percentage": utilization,
            "is_overloaded": utilization > 100
        }
    
    # Chat history operations
    async def save_chat_message(self, message: ChatMessage) -> str:
        result = await self.database.chat_history.insert_one(message.dict())
        return str(result.inserted_id)
    
    async def get_chat_history(self, session_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        cursor = self.database.chat_history.find(
            {"session_id": session_id}
        ).sort("timestamp", -1).limit(limit)
        messages = await cursor.to_list(length=limit)
        return list(reversed(messages))

class RedisCache:
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
    
    async def connect(self):
        """Connect to Redis"""
        try:
            self.redis_client = await redis.from_url(
                os.getenv("REDIS_URL", "redis://localhost:6379"),
                decode_responses=True
            )
            await self.redis_client.ping()
            logger.info("Connected to Redis")
        except Exception as e:
            logger.error(f"Error connecting to Redis: {e}")
            # Redis is optional, so we don't raise
            self.redis_client = None
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Disconnected from Redis")
    
    async def get(self, key: str) -> Optional[str]:
        if self.redis_client:
            try:
                return await self.redis_client.get(key)
            except:
                return None
        return None
    
    async def set(self, key: str, value: str, expire: int = 3600) -> bool:
        if self.redis_client:
            try:
                await self.redis_client.set(key, value, ex=expire)
                return True
            except:
                return False
        return False
    
    async def delete(self, key: str) -> bool:
        if self.redis_client:
            try:
                await self.redis_client.delete(key)
                return True
            except:
                return False
        return False

# Global instances
mongodb = MongoDB()
redis_cache = RedisCache()