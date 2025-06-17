import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    console.log('Project Structure Generator is now active!');

    let disposable = vscode.commands.registerCommand(
        'project-structure-generator.generateStructure', 
        async (uri?: vscode.Uri) => {
            try {
                // Get the workspace folder
                let workspaceFolder: vscode.Uri;
                
                if (uri) {
                    workspaceFolder = uri;
                } else if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                    workspaceFolder = vscode.workspace.workspaceFolders[0].uri;
                } else {
                    vscode.window.showErrorMessage('No workspace folder found. Please open a folder first.');
                    return;
                }

                // Generate the structure
                const structure = await generateProjectStructure(workspaceFolder);
                
                // Create output file
                await createStructureFile(workspaceFolder, structure);
                
                vscode.window.showInformationMessage('Project structure generated successfully!');
            } catch (error) {
                vscode.window.showErrorMessage(`Error generating structure: ${error}`);
            }
        }
    );

    context.subscriptions.push(disposable);
}

async function generateProjectStructure(folderUri: vscode.Uri): Promise<string> {
    const structure: string[] = [];
    
    // Add header
    structure.push('# Project Structure');
    structure.push('');
    structure.push(`Generated on: ${new Date().toLocaleString()}`);
    structure.push(`Root: ${folderUri.fsPath}`);
    structure.push('');
    structure.push('```');
    
    // Build directory tree
    await buildDirectoryTree(folderUri, '', structure, 0);
    
    structure.push('```');
    return structure.join('\n');
}

async function buildDirectoryTree(
    uri: vscode.Uri, 
    prefix: string, 
    structure: string[], 
    depth: number
): Promise<void> {
    // Limit depth to prevent infinite recursion
    if (depth > 10) {
        return;
    }
    
    try {
        const entries = await vscode.workspace.fs.readDirectory(uri);
        
        // Filter out common unwanted directories and files
        const filteredEntries = entries.filter(([name, type]) => {
            const excludePatterns = [
                'node_modules', '.git', '.vscode', 'dist', 'build', 
                'out', '.nyc_output', 'coverage', '.DS_Store', 
                'Thumbs.db', '*.log', '.env'
            ];
            
            return !excludePatterns.some(pattern => {
                if (pattern.includes('*')) {
                    const regex = new RegExp(pattern.replace('*', '.*'));
                    return regex.test(name);
                }
                return name === pattern;
            });
        });
        
        // Sort entries: directories first, then files
        filteredEntries.sort(([nameA, typeA], [nameB, typeB]) => {
            if (typeA === vscode.FileType.Directory && typeB === vscode.FileType.File) {
                return -1;
            }
            if (typeA === vscode.FileType.File && typeB === vscode.FileType.Directory) {
                return 1;
            }
            return nameA.localeCompare(nameB);
        });
        
        for (let i = 0; i < filteredEntries.length; i++) {
            const [name, fileType] = filteredEntries[i];
            const isLast = i === filteredEntries.length - 1;
            const currentPrefix = isLast ? '└── ' : '├── ';
            const nextPrefix = isLast ? '    ' : '│   ';
            
            if (fileType === vscode.FileType.Directory) {
                structure.push(`${prefix}${currentPrefix}${name}/`);
                const childUri = vscode.Uri.joinPath(uri, name);
                await buildDirectoryTree(
                    childUri, 
                    prefix + nextPrefix, 
                    structure, 
                    depth + 1
                );
            } else {
                structure.push(`${prefix}${currentPrefix}${name}`);
            }
        }
    } catch (error) {
        structure.push(`${prefix}├── [Error reading directory: ${error}]`);
    }
}

async function createStructureFile(workspaceUri: vscode.Uri, content: string): Promise<void> {
    const fileName = 'project-structure.md';
    const fileUri = vscode.Uri.joinPath(workspaceUri, fileName);
    
    // Convert string to Uint8Array
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    
    // Write file
    await vscode.workspace.fs.writeFile(fileUri, data);
    
    // Open the file
    const document = await vscode.workspace.openTextDocument(fileUri);
    await vscode.window.showTextDocument(document);
}

export function deactivate() {
    console.log('Project Structure Generator deactivated');
}
