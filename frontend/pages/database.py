# database.py
import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as aioredis
from loguru import logger

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
DATABASE_NAME = os.getenv("DATABASE_NAME", "HRMS")  # Changed from "SIH" to "HRMS"
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")


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
            # Update collection names to match Atlas structure
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

    async def get_all_employees(self) -> List[Dict[str, Any]]:
        """Get all employees from the users collection"""
        return await self.database.users.find({}).to_list(length=None)

    async def get_all_projects(self) -> List[Dict[str, Any]]:
        return await self.database.projects.find({}).to_list(length=None)

    async def get_employee(self, employee_id: str) -> Optional[Dict[str, Any]]:
        """Get employee by ID"""
        try:
            query = {"workInfo.employeeID": employee_id}
            return await self.database.users.find_one(query)
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
            data["createdAt"] = datetime.utcnow()
            data["updatedAt"] = datetime.utcnow()
            result = await self.database.users.insert_one(data)
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

    async def get_employee_workload(self, employee_id: str) -> Dict[str, Any]:
        """Get employee workload metrics"""
        try:
            emp = await self.get_employee(employee_id)
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


# -----------------------------------------------------------
# Redis Wrapper
# -----------------------------------------------------------
class RedisCache:
    def __init__(self):
        self.redis_client: Optional[aioredis.Redis] = None

    async def connect(self):
        if self.redis_client is None:
            logger.info("Connecting to Redis...")
            self.redis_client = aioredis.from_url(
                REDIS_URL, encoding="utf-8", decode_responses=True
            )
            try:
                await self.redis_client.ping()
                logger.info("✅ Redis connected.")
            except Exception as e:
                logger.error(f"Redis connection failed: {e}")

    async def disconnect(self):
        if self.redis_client:
            logger.info("Disconnecting Redis...")
            await self.redis_client.close()
            self.redis_client = None

    async def get(self, key: str) -> Optional[str]:
        if not self.redis_client:
            return None
        return await self.redis_client.get(key)

    async def set(self, key: str, value: str, expire: int = None):
        if not self.redis_client:
            return
        if expire:
            await self.redis_client.set(key, value, ex=expire)
        else:
            await self.redis_client.set(key, value)

    async def delete(self, key: str):
        if not self.redis_client:
            return
        await self.redis_client.delete(key)


# -----------------------------------------------------------
# Singletons
# -----------------------------------------------------------
mongodb = MongoDB()
redis_cache = RedisCache()
