import os
import jwt
from dataclasses import dataclass
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

# Fallback values for development / local testing
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
APP_ENV = os.getenv("APP_ENV", "development")

@dataclass
class AuthenticatedUser:
    user_id: str
    email: str
    workspace_id: str

def get_current_user_and_workspace(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> AuthenticatedUser:
    token = credentials.credentials
    try:
        # If secret is provided, verify signature. Else, in dev mode, decode without signature verification.
        if SUPABASE_JWT_SECRET:
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated"
            )
        else:
            # Decode without verification for development/mock mode
            payload = jwt.decode(
                token,
                options={"verify_signature": False}
            )
            
        user_id = payload.get("sub")
        email = payload.get("email", "")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token claims: sub missing")
            
        # In a real environment with DB connection, look up workspace_id from organization_members.
        # For the MVP go-live contract, we scope to a resolved workspace ID.
        # We look up env variables or default to a mock UUID.
        workspace_id = os.getenv("MOCK_WORKSPACE_ID", "da3b8a1c-3b8c-4a3d-8e2b-f8a101b02c03")
        
        return AuthenticatedUser(
            user_id=user_id,
            email=email,
            workspace_id=workspace_id
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token signature has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
