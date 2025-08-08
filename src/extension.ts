import * as vscode from 'vscode';

interface FolderItem extends vscode.QuickPickItem {
    folderPath: string;
    isDirectory: boolean;
}

export function activate(context: vscode.ExtensionContext) {
    console.log('🚀 Project Structure Generator ACTIVATED!');
    
    const disposable = vscode.commands.registerCommand(
        'project-structure-generator.generateStructure', 
        async (uri?: vscode.Uri) => {
            try {
                let workspaceFolder: vscode.Uri;
                
                if (uri) {
                    workspaceFolder = uri;
                } else if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                    workspaceFolder = vscode.workspace.workspaceFolders[0].uri;
                } else {
                    vscode.window.showErrorMessage('No workspace folder found. Please open a folder first.');
                    return;
                }

                const allFolders = await getAllFolders(workspaceFolder);
                
                if (allFolders.length === 0) {
                    const structure = await generateProjectStructure(workspaceFolder, ['node_modules', '.git', '.vscode']);
                    await createStructureFile(workspaceFolder, structure);
                    vscode.window.showInformationMessage('Project structure generated with default exclusions!');
                    return;
                }
                
                const selectedExclusions = await showFolderSelectionDialog(allFolders);
                
                if (selectedExclusions === undefined) {
                    vscode.window.showInformationMessage('Operation cancelled by user.');
                    return;
                }

                const structure = await generateProjectStructure(workspaceFolder, selectedExclusions);
                await createStructureFile(workspaceFolder, structure);
                vscode.window.showInformationMessage('Project structure generated successfully!');
                
            } catch (error) {
                console.error('Extension Error:', error);
                vscode.window.showErrorMessage(`Error: ${error}`);
            }
        }
    );

    context.subscriptions.push(disposable);
}

async function getAllFolders(folderUri: vscode.Uri, relativePath: string = '', depth: number = 0): Promise<FolderItem[]> {
    const folders: FolderItem[] = [];
    
    if (depth > 2) return folders;
    
    try {
        const entries = await vscode.workspace.fs.readDirectory(folderUri);
        
        for (const [name, fileType] of entries) {
            if (fileType === vscode.FileType.Directory) {
                const currentPath = relativePath ? `${relativePath}/${name}` : name;
                
                folders.push({
                    label: `📁 ${currentPath}`,
                    description: `Folder: ${currentPath}`,
                    folderPath: currentPath,
                    isDirectory: true
                });
                
                if (depth < 1 && !name.startsWith('.') && name !== 'node_modules') {
                    const fullPath = vscode.Uri.joinPath(folderUri, name);
                    const subFolders = await getAllFolders(fullPath, currentPath, depth + 1);
                    folders.push(...subFolders);
                }
            }
        }
    } catch (error) {
        console.error(`Error reading directory ${folderUri.fsPath}:`, error);
    }
    
    return folders.sort((a, b) => a.folderPath.localeCompare(b.folderPath));
}

async function showFolderSelectionDialog(folders: FolderItem[]): Promise<string[] | undefined> {
    const defaultExclusions = ['node_modules', '.git', '.vscode', 'dist', 'build', 'out', '.nyc_output', 'coverage'];
    
    const preSelectedItems = folders.filter(folder => 
        defaultExclusions.some(exclusion => 
            folder.folderPath === exclusion || folder.folderPath.startsWith(exclusion + '/')
        )
    );

    const quickPick = vscode.window.createQuickPick<FolderItem>();
    quickPick.items = folders;
    quickPick.selectedItems = preSelectedItems;
    quickPick.canSelectMany = true;
    quickPick.title = 'Select folders to exclude from project structure';
    quickPick.placeholder = 'Choose folders to exclude (pre-selected: common build/cache folders)';
    
    return new Promise<string[] | undefined>((resolve) => {
        let isAccepted = false;
        
        quickPick.onDidAccept(() => {
            isAccepted = true;
            const selectedFolders = quickPick.selectedItems.map(item => item.folderPath);
            quickPick.dispose();
            resolve(selectedFolders);
        });
        
        quickPick.onDidHide(() => {
            if (!isAccepted) {
                quickPick.dispose();
                resolve(undefined);
            }
        });
        
        quickPick.show();
    });
}

async function generateProjectStructure(folderUri: vscode.Uri, excludedFolders: string[] = []): Promise<string> {
    const structure: string[] = [];
    
    structure.push('# Project Structure');
    structure.push('');
    structure.push(`Generated on: ${new Date().toLocaleString()}`);
    structure.push(`Root: ${folderUri.fsPath}`);
    if (excludedFolders.length > 0) {
        structure.push(`Excluded folders: ${excludedFolders.join(', ')}`);
    }
    structure.push('');
    structure.push('```');
    
    await buildDirectoryTree(folderUri, '', structure, 0, excludedFolders);
    
    structure.push('```');
    return structure.join('\n');
}

async function buildDirectoryTree(
    uri: vscode.Uri, 
    prefix: string, 
    structure: string[], 
    depth: number,
    excludedFolders: string[] = [],
    currentPath: string = ''
): Promise<void> {
    if (depth > 10) return;
    
    try {
        const entries = await vscode.workspace.fs.readDirectory(uri);
        
        const validEntries: Array<[string, vscode.FileType]> = [];
        
        for (const [name, fileType] of entries) {
            const fullPath = currentPath ? `${currentPath}/${name}` : name;
            
            if (fileType === vscode.FileType.File) {
                const fileExclusions = ['.DS_Store', 'Thumbs.db', '.env'];
                if (fileExclusions.includes(name) || /\.log$/.test(name)) {
                    continue;
                }
            }
            
            if (excludedFolders.includes(fullPath)) {
                continue;
            }
            
            validEntries.push([name, fileType]);
        }
        
        validEntries.sort(([nameA, typeA], [nameB, typeB]) => {
            if (typeA === vscode.FileType.Directory && typeB === vscode.FileType.File) return -1;
            if (typeA === vscode.FileType.File && typeB === vscode.FileType.Directory) return 1;
            return nameA.localeCompare(nameB);
        });
        for (let i = 0; i < validEntries.length; i++) {
            const [name, fileType] = validEntries[i];
            const isLast = i === validEntries.length - 1;
            const currentPrefix = isLast ? '└── ' : '├── ';
            const nextPrefix = isLast ? '    ' : '│   ';
            const fullPath = currentPath ? `${currentPath}/${name}` : name;
            
            if (fileType === vscode.FileType.Directory) {
                structure.push(`${prefix}${currentPrefix}${name}/`);
                const childUri = vscode.Uri.joinPath(uri, name);
                await buildDirectoryTree(childUri, prefix + nextPrefix, structure, depth + 1, excludedFolders, fullPath);
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
    
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    
    await vscode.workspace.fs.writeFile(fileUri, data);
    
    const document = await vscode.workspace.openTextDocument(fileUri);
    await vscode.window.showTextDocument(document);
}

export function deactivate() {
    console.log('Project Structure Generator deactivated');
}