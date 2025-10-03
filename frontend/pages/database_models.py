from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class ExperienceLevel(str, Enum):
    JUNIOR = "junior"
    MID = "mid"
    SENIOR = "senior"
    LEAD = "lead"
    PRINCIPAL = "principal"

class ProjectStatus(str, Enum):
    PLANNING = "planning"
    IN_PROGRESS = "in_progress"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class PersonalInfo(BaseModel):
    firstName: str
    lastName: str
    location: str

class WorkInfo(BaseModel):
    employeeID: str
    title: str
    department: str
    skills: List[str]
    experienceLevel: ExperienceLevel
    currentProjects: List[str] = []
    capacityHours: int = Field(default=40, alias="$numberInt")

class Employee(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    email: EmailStr
    password: str
    role: str = "employee"
    personalInfo: PersonalInfo
    workInfo: WorkInfo
    isActive: bool = True
    createdAt: datetime = Field(
        default_factory=datetime.utcnow,
        alias="$date"
    )
    updatedAt: datetime = Field(
        default_factory=datetime.utcnow,
        alias="$date"
    )
    version: Optional[int] = Field(default=0, alias="__v")  # Changed from __v to version

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class Project(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    project_id: str
    name: str
    description: str
    required_skills: List[str]
    team_members: List[str] = []
    start_date: datetime = Field(alias="$date")
    end_date: datetime = Field(alias="$date")
    status: ProjectStatus = ProjectStatus.PLANNING
    priority: int = Field(ge=1, le=5)
    estimated_hours: int = Field(alias="$numberInt")
    actual_hours: Optional[int] = Field(None, alias="$numberInt")
    version: Optional[int] = Field(default=0, alias="__v")  # Changed from __v to version

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class WorkloadMetric(BaseModel):
    employeeID: str
    name: str
    capacity_hours: int
    allocated_hours: float
    utilization_percentage: float
    current_projects: List[str]
    department: str
    skills: List[str]

class SkillGap(BaseModel):
    skill: str
    required_count: int = Field(alias="$numberInt")
    available_count: int = Field(alias="$numberInt")
    gap: int = Field(alias="$numberInt")
    criticality: str
    recommended_action: str

class TeamRecommendation(BaseModel):
    project_id: str
    recommended_team: List[Dict[str, Any]]
    match_score: float = Field(ge=0, le=1)
    reasoning: str
    alternatives: Optional[List[Dict[str, Any]]] = None

class ChatMessage(BaseModel):
    session_id: str
    timestamp: datetime = Field(alias="$date")
    role: str  # "user", "assistant", "system"
    content: str
    metadata: Optional[Dict[str, Any]] = None