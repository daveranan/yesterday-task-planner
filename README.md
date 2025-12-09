# Yesterday

A beautiful, keyboard-first daily task planner application built with Electron, React, and TypeScript.

> **Note**: This application was built with **Gemini 3 pro**.

## Features

- **Daily Focus**: Organize tasks into "Must Do", "Communications", and generic "To Do" lists.
- **Timeline**: Schedule tasks into specific time slots for the day.
- **Keyboard Navigation**: Fully navigable via keyboard for maximum efficiency.
- **Task Rollover**: Unfinished tasks automatically roll over to the next day.
- **Gratefulness & Reflection**: Built-in sections for daily mindfulness.
- **Dark Mode**: Sleek dark mode support.
- **Cross-Platform**: Runs on Windows and macOS.

## Installation

To run the application locally in development mode:

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Start Development Server**
    ```bash
    npm run dev
    ```
    This will start both the Vite dev server and the Electron application window.

## Building

To create a production-ready application for your platform:

- **Build for current OS**:
    ```bash
    npm run dist
    ```

- **Build for Windows**:
    ```bash
    npm run dist:win
    ```
    This generates an installer (`.exe`) in the `dist-electron` directory.

- **Build for macOS**:
    ```bash
    npm run dist:mac
    ```
    This generates a disk image (`.dmg`) in the `dist-electron` directory.

## Keyboard Shortcuts

The application is designed to be used primarily with the keyboard.

| Action | Shortcut | Description |
| :--- | :--- | :--- |
| **Navigation** | | |
| Navigate Up | `ArrowUp` | Move selection up |
| Navigate Down | `ArrowDown` | Move selection down |
| Navigate Left | `ArrowLeft` | Move selection left (between columns) |
| Navigate Right | `ArrowRight` | Move selection right (between columns) |
| Next Day | `Ctrl` + `ArrowRight` | Switch view to the next day |
| Previous Day | `Ctrl` + `ArrowLeft` | Switch view to the previous day |
| **Task Actions** | | |
| Create New Task | `Ctrl` + `Enter` | Create a new task in the active column |
| Toggle Complete | `Space` | Mark selected task as complete/incomplete |
| Edit Title | `Enter` | Edit the title of the selected task |
| Delete Task | `x` | Delete the selected task |
| Duplicate Task | `d` | Duplicate the selected task |
| Copy Title | `c` | Copy task title to clipboard |
| **Move / Grab** | | |
| Grab / Move | `g` | "Grab" a task to move it. Use Arrow keys to move, `Enter` to drop. |
| Cancel / Deselect | `Escape` | Cancel current selection or action |

## Tech Stack

- **Framework**: Electron + React
- **Language**: TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Drag & Drop**: dnd-kit

---
Built with ❤️ and Gemini 3 pro.
