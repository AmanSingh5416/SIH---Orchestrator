# models.py
# re-export the Pydantic models defined in database_models.py
from database_models import (
    Employee,
    Project,
    WorkloadMetric,
    SkillGap,
    TeamRecommendation,
    ChatMessage,
    ExperienceLevel,
    ProjectStatus
)

__all__ = [
    "Employee",
    "Project",
    "WorkloadMetric",
    "SkillGap",
    "TeamRecommendation",
    "ChatMessage",
    "ExperienceLevel",
    "ProjectStatus",
]
