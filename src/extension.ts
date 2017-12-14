'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface TSConfig {
	path: string;
}

export default class TsConfigProvider {
	public async getConfigsForWorkspace(): Promise<Iterable<TSConfig>> {
		if (!vscode.workspace.workspaceFolders) {
			return [];
		}
		const configs = new Map<string, TSConfig>();
		for (const config of await vscode.workspace.findFiles('**/tsconfig*.json', '**/node_modules/**')) {
			const root = vscode.workspace.getWorkspaceFolder(config);
			if (root) {
				configs.set(config.fsPath, {
					path: config.fsPath
				});
			}
		}
		return configs.values();
	}
}

export async function activate(context: vscode.ExtensionContext) {
	const tsconfigProvider = new TsConfigProvider();
	const configs = await tsconfigProvider.getConfigsForWorkspace();
	
	let srcPaths: { srcFolder: string, outFolder: string }[] = [];
	for (const config of configs) {
		var content = fs.readFileSync(config.path);
		var tsConfig = JSON.parse(content.toString());
		
		if (tsConfig['compilerOptions'] && tsConfig['compilerOptions']['outDir']) {
			srcPaths.push({
				srcFolder: path.dirname(config.path),
				outFolder: path.resolve(path.dirname(config.path), tsConfig['compilerOptions']['outDir'])
			})
		}
	}
	
	
    let disposable = vscode.commands.registerCommand('ts-2-js', () => {
		let editor = vscode.window.activeTextEditor;
		
		if (editor) {
			let uri = editor.document.uri;
			for (let i = 0; i < srcPaths.length; i++) {
				if (uri.fsPath.indexOf(srcPaths[i].srcFolder) >= 0) {
					let fileRelativePath = uri.fsPath.replace(srcPaths[i].srcFolder, '');
					if (fileRelativePath.indexOf('/') === 0) {
						fileRelativePath = fileRelativePath.substr(1);
					}
					
					let finalPath = path.resolve(srcPaths[i].outFolder, fileRelativePath);
					finalPath = finalPath.replace(/\.ts$/, '.js');
					console.log(finalPath);
					vscode.window.showTextDocument(vscode.Uri.file(finalPath), {viewColumn: 2});
					break;
				}
			}
		}	
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {
}