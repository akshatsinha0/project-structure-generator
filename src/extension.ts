import * as vscode from 'vscode';

// Tree QuickPick item for files/folders with expand/collapse
interface NodeItem extends vscode.QuickPickItem {
    path:string; // relative to workspace root
    isDir:boolean;
    depth:number; // 0=root
    expanded?:boolean;
    parent?:string|null; // parent path
    // VS Code allows item buttons; keep loose typing for compatibility
    buttons?: readonly vscode.QuickInputButton[];
}

const DEFAULT_EXCLUDES=['node_modules','.git','.vscode','dist','build','out','.nyc_output','coverage'];

export function activate(context: vscode.ExtensionContext) {
    const disposable=vscode.commands.registerCommand('project-structure-generator.generateStructure',async(uri?:vscode.Uri)=>{
        try{
            let workspaceFolder:vscode.Uri;
            if(uri){workspaceFolder=uri;}else if(vscode.workspace.workspaceFolders&&vscode.workspace.workspaceFolders.length>0){
                workspaceFolder=vscode.workspace.workspaceFolders[0].uri;
            }else{
                vscode.window.showErrorMessage('No workspace folder found. Please open a folder first.');
                return;
            }
            const selectedExclusions=await showExcludeSelectionDialog(workspaceFolder);
            if(selectedExclusions===undefined)return; // canceled
            const structure=await generateProjectStructure(workspaceFolder,selectedExclusions);
            await createStructureFile(workspaceFolder,structure);
            vscode.window.showInformationMessage('Project structure generated successfully!');
        }catch(error){
            console.error('Extension Error:',error);
            vscode.window.showErrorMessage(`Error: ${error}`);
        }
    });
    context.subscriptions.push(disposable);
}

async function showExcludeSelectionDialog(root:vscode.Uri):Promise<string[]|undefined>{
    const expandBtn: vscode.QuickInputButton={iconPath:new vscode.ThemeIcon('chevron-right'),tooltip:'Expand'};
    const collapseBtn: vscode.QuickInputButton={iconPath:new vscode.ThemeIcon('chevron-down'),tooltip:'Collapse'};

    const quickPick=vscode.window.createQuickPick<NodeItem>();
    quickPick.canSelectMany=true;
    quickPick.title='Select folders/files to exclude from project structure';
    quickPick.placeholder='Choose items to exclude (pre-selected: common build/cache folders)';

    const selectedPaths=new Set<string>();

    // Helpers
    const nameOf=(p:string)=>p.split('/').pop()||p;
    const mkLabel=(item:NodeItem)=>`${'  '.repeat(item.depth)}${item.isDir?'📁':'📄'} ${nameOf(item.path)}`;

    async function readChildren(parentPath:string|null):Promise<NodeItem[]>{
        const baseUri=parentPath?vscode.Uri.joinPath(root,...parentPath.split('/')):root;
        const depth=parentPath?parentPath.split('/').length:0;
        const entries=await vscode.workspace.fs.readDirectory(baseUri);
        const items:NodeItem[]=[];
        for(const [name,type]of entries){
            // skip generated output file
            if(type===vscode.FileType.File&&name==='project-structure.md')continue;
            const rel=parentPath?`${parentPath}/${name}`:name;
            const isDir=type===vscode.FileType.Directory;
            const node:NodeItem={
                label:'', // set below
                description:isDir?undefined:rel,
                path:rel,
                isDir,
                depth,
                parent:parentPath,
                buttons:isDir?[expandBtn]:undefined
            } as any;
            node.label=mkLabel(node);
            items.push(node);
        }
        // sort: directories first then by name
        items.sort((a,b)=>a.isDir===b.isDir?a.path.localeCompare(b.path):a.isDir?-1:1);
        // preselect defaults present at this level
        for(const it of items){
            if(DEFAULT_EXCLUDES.some(x=>it.path===x||it.path.startsWith(x+'/')))selectedPaths.add(it.path);
        }
        return items;
    }

    function refreshSelection(){
        quickPick.selectedItems=quickPick.items.filter(i=>selectedPaths.has(i.path));
    }

    function removeDescendants(parentPath:string){
        const toRemove:string[]=[];
        for(const it of quickPick.items){
            if(it.parent&& (it.parent===parentPath||it.parent.startsWith(parentPath+'/'))){
                toRemove.push(it.path);
            }
        }
        if(toRemove.length===0)return;
        quickPick.items=quickPick.items.filter(i=>!toRemove.includes(i.path));
    }

    quickPick.items=await readChildren(null);
    refreshSelection();

    quickPick.onDidChangeSelection(items=>{
        selectedPaths.clear();
        for(const it of items)selectedPaths.add(it.path);
    });

    quickPick.onDidTriggerItemButton(async e=>{
        const item=e.item as NodeItem;
        const isExpanded=item.expanded===true;
        if(isExpanded){
            // collapse
            removeDescendants(item.path);
            item.expanded=false;
            item.buttons=[expandBtn];
            quickPick.items=[...quickPick.items];
            refreshSelection();
            return;
        }
        // expand
        const children=await readChildren(item.path);
        // insert right after the parent
        const items=quickPick.items.slice();
        const idx=items.findIndex(i=>i.path===item.path);
        items.splice(idx+1,0,...children);
        item.expanded=true;
        item.buttons=[collapseBtn];
        quickPick.items=items;
        refreshSelection();
    });

    return await new Promise<string[]|undefined>(resolve=>{
        let accepted=false;
        quickPick.onDidAccept(()=>{
            accepted=true;
            const selections=quickPick.selectedItems.map(i=>i.path);
            quickPick.dispose();
            resolve(selections);
        });
        quickPick.onDidHide(()=>{if(!accepted){quickPick.dispose();resolve(undefined);}});
        quickPick.show();
    });
}

async function generateProjectStructure(folderUri:vscode.Uri,excludedPaths:string[]=[]):Promise<string>{
    const structure:string[]=[];
    structure.push('# Project Structure');
    structure.push('');
    structure.push(`Generated on: ${new Date().toLocaleString()}`);
    structure.push(`Root: ${folderUri.fsPath}`);
    if(excludedPaths.length>0)structure.push(`Excluded: ${excludedPaths.join(', ')}`);
    structure.push('');
    structure.push('```');
    await buildDirectoryTree(folderUri,'',structure,0,new Set(excludedPaths));
    structure.push('```');
    return structure.join('\n');
}

function isExcluded(fullPath:string,excluded:Set<string>):boolean{
    for(const ex of excluded){
        if(fullPath===ex||fullPath.startsWith(ex+'/'))return true;
    }
    return false;
}

async function buildDirectoryTree(uri:vscode.Uri,prefix:string,structure:string[],depth:number,excluded:Set<string>,currentPath:string=''):Promise<void>{
    if(depth>50)return;
    try{
        const entries=await vscode.workspace.fs.readDirectory(uri);
        const valid:Array<[string,vscode.FileType]>=[];
        for(const [name,type] of entries){
            const full=currentPath?`${currentPath}/${name}`:name;
            if(type===vscode.FileType.File){
                const fileExclusions=['.DS_Store','Thumbs.db','.env','project-structure.md'];
                if(fileExclusions.includes(name)||/\.log$/.test(name))continue;
            }
            if(isExcluded(full,excluded))continue;
            valid.push([name,type]);
        }
        valid.sort(([a,ta],[b,tb])=>ta===tb?a.localeCompare(b):ta===vscode.FileType.Directory?-1:1);
        for(let i=0;i<valid.length;i++){
            const [name,type]=valid[i];
            const isLast=i===valid.length-1;
            const currentPrefix=isLast?'└── ':'├── ';
            const nextPrefix=isLast?'    ':'│   ';
            const full=currentPath?`${currentPath}/${name}`:name;
            if(type===vscode.FileType.Directory){
                structure.push(`${prefix}${currentPrefix}${name}/`);
                await buildDirectoryTree(vscode.Uri.joinPath(uri,name),prefix+nextPrefix,structure,depth+1,excluded,full);
            }else{
                structure.push(`${prefix}${currentPrefix}${name}`);
            }
        }
    }catch(error){
        structure.push(`${prefix}├── [Error reading directory: ${error}]`);
    }
}

async function createStructureFile(workspaceUri:vscode.Uri,content:string):Promise<void>{
    const fileName='project-structure.md';
    const fileUri=vscode.Uri.joinPath(workspaceUri,fileName);
    const encoder=new TextEncoder();
    await vscode.workspace.fs.writeFile(fileUri,encoder.encode(content));
    const document=await vscode.workspace.openTextDocument(fileUri);
    await vscode.window.showTextDocument(document);
}

export function deactivate(){
    // no-op
}
