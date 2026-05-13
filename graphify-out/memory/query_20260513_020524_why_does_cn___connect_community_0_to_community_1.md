---
type: "query"
date: "2026-05-13T02:05:24.419742+00:00"
question: "Why does cn() connect Community 0 to Community 1, Community 10, Community 3, and Community 5?"
contributor: "graphify"
source_nodes: ["cn()", "Button()", "StatusChip()", "Topbar()", "RoleBadge()", "DashboardPage.tsx"]
---

# Q: Why does cn() connect Community 0 to Community 1, Community 10, Community 3, and Community 5?

## Answer

cn() is the shared class-name composition helper in src/lib/cn.ts. The graph shows it bridges communities because UI primitives, shared chips, layout components, and dashboard/page modules all import or call it directly. Community 0 contains many lower-level UI and detail components such as Badge, Input, Tabs, TaskDetailDrawer, ProjectDetailPage, XPBar, and related shared components. Community 1 contains dashboard and operational UI components such as Button, Card, ProgressBar, ServiceChip, StatusChip, admin DashboardPage, employee DashboardPage, ProjectsPage, and GamificationPage. Community 3 contains layout and identity/navigation components such as Avatar, AvatarGroup, Topbar, Sidebar, ClientShell, and RoleBadge. Community 10 touches role/status typing through RoleBadge, while Community 5 touches the client dashboard. In plain terms, cn() is not domain logic; it is styling infrastructure used across most visible UI surfaces, so graph centrality is high because visual components converge on it.

## Source Nodes

- cn()
- Button()
- StatusChip()
- Topbar()
- RoleBadge()
- DashboardPage.tsx