import os
import uuid
from datetime import datetime
from typing import Optional, Dict
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from dotenv import load_dotenv
from loguru import logger
from database import mongodb, redis_cache
from langchain_agents import orchestrator_agent  # This now imports the SimpleOrchestratorAgent
from database_models import PersonalInfo, WorkInfo  # Add these imports

load_dotenv()

# -----------------------------------------
# Chat Interface Models
# -----------------------------------------
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = ""

class ChatResponse(BaseModel):
    session_id: str
    response: str

class EmployeeCreate(BaseModel):
    email: EmailStr
    password: str
    personalInfo: PersonalInfo  # Now PersonalInfo is defined
    workInfo: WorkInfo         # Now WorkInfo is defined
    role: str = "employee"

class EmployeeUpdate(BaseModel):
    personalInfo: Optional[PersonalInfo] = None  # Now PersonalInfo is defined
    workInfo: Optional[WorkInfo] = None         # Now WorkInfo is defined
    isActive: Optional[bool] = None

# -----------------------------------------
# Database Initialization
# -----------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect to databases on startup
    await mongodb.connect()
    await redis_cache.connect()
    logger.info("Connected to databases")
    yield
    # Disconnect from databases on shutdown
    await mongodb.disconnect()
    await redis_cache.disconnect()
    logger.info("Disconnected from databases")

# -----------------------------------------
# FastAPI App Setup
# -----------------------------------------
app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------
# Chat Endpoints
# -----------------------------------------
@app.post("api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # Generate session ID if not provided
        session_id = request.session_id or str(uuid.uuid4())
        # Process message through orchestrator agent
        response = await orchestrator_agent.process_message(session_id, request.message)
        return ChatResponse(
            session_id=session_id,
            response=response
        )
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.delete("/api/chat/{session_id}")
async def clear_chat(session_id: str):
    try:
        await orchestrator_agent.clear_session(session_id)
        return {"status": "success", "message": "Chat history cleared"}
    except Exception as e:
        logger.error(f"Error clearing chat session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.post("/api/employees/", response_model=Dict[str, str])
async def create_employee(employee: EmployeeCreate):
    try:
        employee_id = await mongodb.create_employee(employee)
        if not employee_id:
            raise HTTPException(status_code=400, detail="Failed to create employee")
        return {"id": employee_id}
    except Exception as e:
        logger.error(f"Error creating employee: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------
# Root endpoint
# -----------------------------------------
@app.get("/")
async def root():
    return {
        "status": "ok",
        "message": "Resource Orchestrator API is running"
    }

# Configure logging
logger.add("logs/app.log", rotation="10 MB", retention="10 days", level="INFO")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)