# Teams API Documentation for Frontend Integration

## Overview
The `/teams` backend has been updated to support automatic team management based on tasks. When a task is created, a team is automatically generated with all task members.

## Data Models

### Task Schema
```typescript
{
  _id: string,
  title: string,
  description: string,
  day: string,                          // e.g., "Monday"
  startTime: number,                    // e.g., 10.5 for 10:30 AM
  duration: number,                     // In hours
  label: 'High' | 'Medium' | 'Low' | 'Stand-by',
  members: string[],                    // User IDs
  teamId: string,                       // Reference to Team
  owner: string,                        // User ID (task creator)
  admin: string,                        // User ID (can be changed by owner)
  startDate: Date,
  endDate: Date,
  // Legacy fields (optional)
  status: 'todo' | 'in-progress' | 'done',
  priority: 'low' | 'medium' | 'high',
  dueDate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Team Schema
```typescript
{
  _id: string,
  name: string,                         // Auto-generated as "Team: {taskTitle}"
  members: string[],                    // User IDs (includes owner)
  owner: string,                        // User ID (task creator, cannot be changed)
  admin: string,                        // User ID (can be changed by owner)
  taskId: string,                       // Reference to Task
  createdAt: Date,
  updatedAt: Date
}
```

---

## Backend Changes Made

### 1. **Task Schema Updates** (`task.schema.ts`)
Added new fields to support calendar-based task management:
- `day`: string (e.g., "Monday")
- `startTime`: number (e.g., 10.5 for 10:30 AM)
- `duration`: number (in hours)
- `label`: 'High' | 'Medium' | 'Low' | 'Stand-by'
- `members`: string[] (array of user IDs)
- `teamId`: ObjectId reference to Team
- `owner`: ObjectId reference to the task creator (User)
- `admin`: ObjectId reference to the admin (User, initially same as owner)
- `startDate`: Date
- `endDate`: Date

### 2. **Team Schema Updates** (`team.schema.ts`)
Simplified team structure:
- `name`: string (auto-generated)
- `members`: string[] (array of user IDs)
- `owner`: ObjectId reference to the task creator (User, cannot be changed)
- `admin`: ObjectId reference to the admin (User, can be changed by owner)
- `taskId`: ObjectId reference to Task (required)

### 3. **Automatic Team Management**
Teams are now automatically:
- **Created** when a task is created
- **Updated** when task members change
- **Deleted** when a task is deleted

---

## API Endpoints

### Tasks Endpoints

#### 1. **Create Task** (Creates Team Automatically)
```http
POST /tasks
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "title": "Design Review",
  "description": "Review the new UI designs with the team.",
  "day": "Monday",
  "startTime": 10.5,
  "duration": 2,
  "label": "High",
  "members": ["userId1", "userId2", "userId3"], // User IDs
  "startDate": "2025-10-22T10:00:00Z",
  "endDate": "2025-10-22T12:00:00Z",
  // Legacy/optional fields
  "assignedTo": ["userId1", "userId2"], // Optional: User IDs
  "projectId": "projectId123", // Optional
  "status": "todo", // Optional: 'todo', 'in-progress', 'done'
  "priority": "high", // Optional: 'low', 'medium', 'high'
  "dueDate": "2025-10-25T10:00:00Z" // Optional: ISO date string
}
```

**Response:**
```json
{
  "_id": "task123",
  "title": "Design Review",
  "description": "Review the new UI designs with the team.",
  "day": "Monday",
  "startTime": 10.5,
  "duration": 2,
  "label": "High",
  "members": ["userId1", "userId2", "userId3"],
  "teamId": "team123",
  "owner": {
    "_id": "userId1",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "admin": {
    "_id": "userId1",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "startDate": "2025-10-22T10:00:00Z",
  "endDate": "2025-10-22T12:00:00Z",
  "status": "todo",
  "priority": "high",
  "createdAt": "2025-10-22T10:00:00Z",
  "updatedAt": "2025-10-22T10:00:00Z"
}
```

---

#### 2. **Update Task** (Updates Team Members Automatically)
```http
PUT /tasks/:id
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "title": "Updated Design Review",
  "members": ["newMember1", "newMember2"],
  "assignedTo": ["userId1", "userId3"],
  "label": "Medium",
  "status": "in-progress"
}
```

**Note:** When you update `members` or `assignedTo`, the associated team members are automatically updated.

---

#### 3. **Delete Task** (Deletes Team Automatically)
```http
DELETE /tasks/:id
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "message": "Task deleted successfully"
}
```

---

#### 4. **Get All Tasks**
```http
GET /tasks
Authorization: Bearer <JWT_TOKEN>
```

Optional query parameter:
- `?status=todo` (filter by status: 'todo', 'in-progress', 'done')

---

#### 5. **Get Single Task**
```http
GET /tasks/:id
Authorization: Bearer <JWT_TOKEN>
```

---

#### 6. **Get Upcoming Tasks**
```http
GET /tasks/upcoming?days=7
Authorization: Bearer <JWT_TOKEN>
```

---

#### 7. **Mark Task as Completed**
```http
PATCH /tasks/:id/complete
Authorization: Bearer <JWT_TOKEN>
```

---

### Teams Endpoints

#### 1. **Get All User Teams**
```http
GET /teams
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
[
  {
    "_id": "team123",
    "name": "Team: Design Review",
    "description": "Team automatically created for task: Design Review",
    "taskId": {
      "_id": "task123",
      "title": "Design Review",
      "day": "Monday",
      "startTime": 10.5,
      "duration": 2
    },
    "owner": {
      "_id": "userId1",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "admin": {
      "_id": "userId1",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "members": [
      {
        "userId": {
          "_id": "userId1",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "role": "owner",
        "joinedAt": "2025-10-22T10:00:00Z"
      },
      {
        "userId": {
          "_id": "userId2",
          "name": "Jane Smith",
          "email": "jane@example.com"
        },
        "role": "member",
        "joinedAt": "2025-10-22T10:00:00Z"
      }
    ],
    "isActive": true,
    "createdAt": "2025-10-22T10:00:00Z"
  }
]
```

---

#### 2. **Get Team by ID**
```http
GET /teams/:id
Authorization: Bearer <JWT_TOKEN>
```

**Response:** Same structure as individual team in the list above.

---

#### 3. **Get Team by Task ID**
```http
GET /teams/task/:taskId
Authorization: Bearer <JWT_TOKEN>
```

**Response:** Same structure as individual team.

---

#### 4. **Change Team Admin** (Owner Only)
```http
PATCH /teams/:id/admin
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "adminId": "userId2"
}
```

**Response:** Updated team object with new admin.

**Note:** Only the owner can change the admin. The new admin must be a member of the team.

---

#### 5. **Create Team Manually** (Optional, not automatic)
```http
POST /teams
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "name": "Manual Team",
  "description": "A manually created team"
}
```

---

#### 6. **Add Member to Team**
```http
POST /teams/:id/members
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "userId": "userId3",
  "role": "member"
}
```

**Note:** Only owners and admins can add members.

---

#### 7. **Remove Member from Team**
```http
DELETE /teams/:id/members/:userId
Authorization: Bearer <JWT_TOKEN>
```

**Note:** Only owners and admins can remove members.

---

## Frontend Integration Guide

### 1. **Creating a Task with Team**

```javascript
// Example: Create a task and automatically create a team
const createTask = async (taskData) => {
  const response = await fetch('http://localhost:3000/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: taskData.title,
      description: taskData.description,
      day: taskData.day,
      startTime: taskData.startTime,
      duration: taskData.duration,
      label: taskData.label,
      members: taskData.members, // Avatar URLs or identifiers
      assignedTo: taskData.userIds // Optional: actual user IDs for assignment
    })
  });
  
  const task = await response.json();
  
  // Team is automatically created
  // Fetch the team if needed
  const teamResponse = await fetch(`http://localhost:3000/teams/task/${task._id}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const team = await teamResponse.json();
  return { task, team };
};
```

---

### 2. **Displaying Teams in Calendar View**

```javascript
// Example: Fetch all user teams with task information
const fetchTeams = async () => {
  const response = await fetch('http://localhost:3000/teams', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const teams = await response.json();
  
  // Each team has taskId populated with task details
  return teams.map(team => ({
    id: team._id,
    taskId: team.taskId._id,
    taskTitle: team.taskId.title,
    day: team.taskId.day,
    startTime: team.taskId.startTime,
    duration: team.taskId.duration,
    owner: team.owner,
    admin: team.admin,
    members: team.members
  }));
};
```

---

### 3. **Changing Team Admin** (Owner Only)

```javascript
// Example: Change team admin
const changeAdmin = async (teamId, newAdminId) => {
  const response = await fetch(`http://localhost:3000/teams/${teamId}/admin`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      adminId: newAdminId
    })
  });
  
  const updatedTeam = await response.json();
  return updatedTeam;
};
```

---

### 4. **Updating Task Members** (Updates Team Automatically)

```javascript
// Example: Update task members
const updateTaskMembers = async (taskId, newMembers) => {
  const response = await fetch(`http://localhost:3000/tasks/${taskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      members: newMembers,
      assignedTo: newMembers.map(m => m.userId) // If you have user IDs
    })
  });
  
  const updatedTask = await response.json();
  
  // Team members are automatically updated
  // Fetch updated team if needed
  const teamResponse = await fetch(`http://localhost:3000/teams/task/${taskId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const updatedTeam = await teamResponse.json();
  return { task: updatedTask, team: updatedTeam };
};
```

---

### 5. **Deleting a Task** (Deletes Team Automatically)

```javascript
// Example: Delete a task and its team
const deleteTask = async (taskId) => {
  const response = await fetch(`http://localhost:3000/tasks/${taskId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  // Team is automatically deleted
  const result = await response.json();
  return result;
};
```

---

## Team Roles and Permissions

- **Owner**: The task creator. Can change the admin and has full control.
- **Admin**: Assigned by the owner. Can add/remove members.
- **Member**: Regular team member invited to the task.

---

## Important Notes

1. **Automatic Team Creation**: When you create a task, a team is automatically created. You don't need to manually create teams.

2. **Member Synchronization**: When you update task members, the team members are automatically synchronized.

3. **Team Deletion**: When you delete a task, the associated team is automatically deleted.

4. **Owner vs Admin**:
   - The **owner** is always the task creator and cannot be changed.
   - The **admin** can be changed by the owner.
   - Initially, owner and admin are the same person.

5. **Authentication**: All endpoints require JWT authentication via the `Authorization: Bearer <token>` header.

6. **Member Identifiers**: The `members` field in tasks can store avatar URLs or any string identifiers. For actual user assignment, use the `assignedTo` field with user IDs.

---

## Error Handling

Common error responses:

```json
{
  "statusCode": 404,
  "message": "Task not found or you don't have permission"
}
```

```json
{
  "statusCode": 403,
  "message": "Only the owner can change the admin"
}
```

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

## Summary of What's Implemented

✅ **Tasks**
- POST /tasks (creates task + team automatically)
- GET /tasks (list all user tasks)
- GET /tasks/:id (get single task)
- PUT /tasks/:id (update task + sync team members)
- DELETE /tasks/:id (delete task + team)
- PATCH /tasks/:id/complete (mark as completed)
- GET /tasks/upcoming (get upcoming tasks)

✅ **Teams**
- GET /teams (list all user teams)
- GET /teams/:id (get single team)
- GET /teams/task/:taskId (get team by task ID)
- PATCH /teams/:id/admin (change admin - owner only)
- POST /teams (manual team creation - optional)
- POST /teams/:id/members (add member)
- DELETE /teams/:id/members/:userId (remove member)

✅ **Automatic Features**
- Team creation when task is created
- Team member sync when task members change
- Team deletion when task is deleted
- Owner and admin management
- Permission checks

---

## Next Steps for Frontend

1. **Update API Base URL**: Set your backend URL (e.g., `http://localhost:3000`)

2. **Add Authentication**: Include JWT token in all requests

3. **Create API Service**: Create a centralized API service for all endpoints

4. **Handle Errors**: Add proper error handling for all API calls

5. **Display Teams**: Show teams in your calendar view with task information

6. **Admin Controls**: Show admin change UI only to team owners

7. **Member Management**: Allow owners/admins to add/remove members

8. **Real-time Updates**: Consider adding WebSocket support for live team updates (optional)

---

## Example: Complete Frontend API Service

```javascript
// api/teams.js
const API_BASE_URL = 'http://localhost:3000';

class TeamsAPI {
  constructor(token) {
    this.token = token;
  }

  async createTask(taskData) {
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(taskData)
    });
    return response.json();
  }

  async getTeams() {
    const response = await fetch(`${API_BASE_URL}/teams`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    return response.json();
  }

  async getTeamByTask(taskId) {
    const response = await fetch(`${API_BASE_URL}/teams/task/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    return response.json();
  }

  async changeAdmin(teamId, adminId) {
    const response = await fetch(`${API_BASE_URL}/teams/${teamId}/admin`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({ adminId })
    });
    return response.json();
  }

  async updateTask(taskId, updates) {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(updates)
    });
    return response.json();
  }

  async deleteTask(taskId) {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    return response.json();
  }
}

export default TeamsAPI;
```

---

That's it! Your backend is now fully configured to support the calendar-based teams page with automatic team management.
