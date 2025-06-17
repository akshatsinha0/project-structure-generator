# Project Structure Generator

Generate a detailed text file (`project-structure.md`) of your current workspace’s full file and folder hierarchy with a single command in VS Code.

![Extension Demo](images/demo.gif)

## Features

- Instantly produces an ASCII tree listing all directories and files in your workspace, respecting `.gitignore` patterns and user-defined exclude filters[^1].
- Outputs to a markdown file (`project-structure.md`) at the workspace root and automatically opens it in the editor[^2].
- Provides a Command Palette entry ("Generate Project Structure") and Explorer context menu integration for folders[^3].

## Requirements

- Visual Studio Code v1.60.0 or later[^4].
- Node.js v12 or newer installed on your system[^5].

## Installation

1. **Install from the VS Code Marketplace:**  
   [Link to Marketplace](https://marketplace.visualstudio.com/) *(replace with your extension’s link)*  
2. **Or install manually from `.vsix`:**  
   - Download the `.vsix` file from the [Releases](https://github.com/your-repo/releases) page.  
   - In VS Code, run `Extensions: Install from VSIX...` from the Command Palette.

## Usage

1. Open any workspace folder in VS Code.  
2. Run **Generate Project Structure** from the Command Palette (`Ctrl+Shift+P`), or right-click a folder in the Explorer and select **Generate Project Structure**.  
3. A new file, `project-structure.md`, will appear at the workspace root with the full ASCII tree of your project.

### Example Output

├── src/  
│   ├── components/  
│   │   └── Header.tsx  
│   ├── App.tsx  
│   └── index.tsx  
└── public/  
    ├── index.html  
    └── favicon.ico  
