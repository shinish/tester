# Automation Platform

A modern automation platform built with Next.js that integrates with Ansible AWX for executing runbooks and managing IT automation workflows.

## Features

- **Dashboard**: Overview of automation statistics, recent activity, and notifications
- **Automation Catalog**: Discover and search automations across your organization
- **Automation Builder**: Multi-step wizard to create custom automations
  - Define automation details (name, namespace, description, tags)
  - Design input forms with drag-and-drop components (coming soon)
  - Configure Ansible AWX backend integration
- **Run Management**: Execute automations and track their status
- **Schedules**: Create and manage recurring automation tasks
- **Connectivity Check**: Upload server lists and test network connectivity to specific ports
- **Ansible AWX Integration**: Execute job templates via AWX API

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: SQLite with Prisma ORM
- **UI**: Tailwind CSS + Lucide Icons
- **API Integration**: Ansible AWX REST API
- **Language**: JavaScript (JSX)

## Prerequisites

- Node.js 18+ and npm
- Ansible AWX instance (optional for development)

## Installation

1. Clone the repository and navigate to the project directory:

```bash
cd automation-platform
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env` and configure your Ansible AWX credentials:

```env
AWX_BASE_URL="https://your-awx-instance.com/api/v2"
AWX_TOKEN="your-awx-api-token-here"
```

4. Initialize the database:

```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Start the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
automation-platform/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── automations/          # Automation CRUD endpoints
│   │   ├── schedules/            # Schedule management endpoints
│   │   └── dashboard/            # Dashboard stats endpoint
│   ├── automations/              # Automation pages
│   │   └── new/                  # Create new automation wizard
│   ├── catalog/                  # Automation catalog/discovery
│   ├── connectivity/             # Connectivity check page
│   ├── schedules/                # Schedule management page
│   ├── layout.jsx                # Root layout with sidebar
│   ├── page.jsx                  # Dashboard page
│   └── globals.css               # Global styles
├── components/                   # Reusable React components
│   ├── Sidebar.jsx
│   ├── Header.jsx
│   ├── Button.jsx
│   └── Card.jsx
├── lib/                          # Utility libraries
│   ├── prisma.js                 # Prisma client
│   └── awx-api.js                # Ansible AWX API client
├── prisma/                       # Database schema and migrations
│   └── schema.prisma
└── public/                       # Static assets
```

## Database Schema

The application uses SQLite with the following main entities:

- **Automation**: Stores automation definitions, form schemas, and AWX configuration
- **Run**: Tracks execution history and results
- **Schedule**: Manages recurring automation tasks
- **Notification**: Stores user notifications
- **ConnectivityCheck**: Tracks server connectivity checks

## API Endpoints

### Automations

- `GET /api/automations` - List all automations (with filters)
- `POST /api/automations` - Create a new automation
- `GET /api/automations/[id]` - Get automation details
- `PUT /api/automations/[id]` - Update an automation
- `DELETE /api/automations/[id]` - Delete an automation
- `POST /api/automations/[id]/run` - Execute an automation

### Schedules

- `GET /api/schedules` - List all schedules
- `POST /api/schedules` - Create a new schedule

### Dashboard

- `GET /api/dashboard/stats` - Get dashboard statistics and recent activity

## Ansible AWX Integration

The platform integrates with Ansible AWX to execute automations:

1. **Configuration**: Set AWX credentials in `.env`
2. **Template Mapping**: Link automations to AWX job templates
3. **Variable Mapping**: Map form inputs to AWX extra variables using YAML
4. **Execution**: Launch jobs via AWX API and track status
5. **Results**: Store job IDs and results in the database

### Example Extra Vars Mapping

```yaml
vm_name: "{{form.hostname}}"
cpu_cores: "{{form.cpu}}"
memory_mb: "{{form.memory}}"
os_image: "{{form.operating_system}}"
```

## Development

### Run Database Migrations

```bash
npm run prisma:migrate
```

### View Database with Prisma Studio

```bash
npm run prisma:studio
```

### Build for Production

```bash
npm run build
npm start
```

## Features Roadmap

- [ ] Drag-and-drop form builder (Step 2 of automation wizard)
- [ ] Real-time job status updates via WebSocket
- [ ] User authentication and authorization
- [ ] Role-based access control (RBAC)
- [ ] Audit logging
- [ ] Advanced scheduling (cron expressions)
- [ ] Notification preferences
- [ ] Automation versioning
- [ ] Template marketplace

## License

ISC

## Support

For issues and questions, please open an issue in the repository.
