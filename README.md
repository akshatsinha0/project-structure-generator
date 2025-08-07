# Project Structure Generator

Generate a detailed text file (`project-structure.md`) of your current workspace’s full file and folder hierarchy with a single command in VS Code.

![Extension Demo](images/demo.gif)

## Features

- **Interactive Folder Exclusion**: When generating project structure, a popup window allows you to select which folders to exclude from the output
- **Smart Pre-selection**: Common build and cache folders (node_modules, .git, .vscode, dist, build, out) are pre-selected for exclusion
- **ASCII Tree Output**: Produces a clean ASCII tree listing of your workspace structure
- **Markdown Export**: Outputs to a `project-structure.md` file at the workspace root and automatically opens it
- **Command Palette Integration**: Access via "Generate Project Structure" command (Ctrl+Shift+P)

## Requirements

- Visual Studio Code v1.60.0 or later[^4].
- Node.js v12 or newer installed on your system[^5].

## Installation

1. **Install from the VS Code Marketplace:**  
   [Link to Marketplace](https://marketplace.visualstudio.com/items?itemName=akshatsinha0.project-structure-generator-pro)
2. **Or install manually from `.vsix`:**  
   - Download the `.vsix` file from the [Releases](https://github.com/akshatsinha0/project-structure-generator.git/releases) page.  
   - In VS Code, run `Extensions: Install from VSIX...` from the Command Palette.

## Usage

1. Open any workspace folder in VS Code
2. Run **Generate Project Structure** from the Command Palette (`Ctrl+Shift+P`)
3. **NEW**: A popup window will appear showing all folders in your project
4. Select which folders you want to exclude from the generated structure (common folders like `node_modules`, `.git`, etc. are pre-selected)
5. Click to confirm your selection
6. A new file, `project-structure.md`, will appear at the workspace root with the filtered ASCII tree of your project

### Example Output

├── src/  
│   ├── components/  
│   │   └── Header.tsx  
│   ├── App.tsx  
│   └── index.tsx  
└── public/  
    ├── index.html  
    └── favicon.ico  
