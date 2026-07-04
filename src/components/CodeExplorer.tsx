import { useState, useEffect } from "react";
import { Folder, File, Code, Copy, Check, Download, ChevronRight, ChevronDown } from "lucide-react";
import { FileNode } from "../types";

export default function CodeExplorer() {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState<string>("config.py");
  const [fileContent, setFileContent] = useState<string>("");
  const [contentLoading, setContentLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({
    "": true,
    "src": true,
  });

  // Fetch file tree
  const fetchTree = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/files");
      const data = await res.json();
      if (data.success) {
        setTree(data.tree);
      }
    } catch (err) {
      console.error("Failed to fetch directory tree:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch specific file content
  const fetchContent = async (path: string) => {
    try {
      setContentLoading(true);
      const res = await fetch(`/api/file-content?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.success) {
        setFileContent(data.content);
      } else {
        setFileContent(`# Error: ${data.error}`);
      }
    } catch (err: any) {
      setFileContent(`# Error loading file content: ${err.message}`);
    } finally {
      setContentLoading(false);
    }
  };

  useEffect(() => {
    fetchTree();
  }, []);

  useEffect(() => {
    if (selectedPath) {
      fetchContent(selectedPath);
    }
  }, [selectedPath]);

  const toggleDirectory = (path: string) => {
    setExpandedDirs(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const filename = selectedPath.split("/").pop() || "code.py";
    const blob = new Blob([fileContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Recursively render folder tree nodes
  const renderNode = (node: FileNode, level = 0) => {
    const isExpanded = expandedDirs[node.path];
    const isSelected = selectedPath === node.path;
    const paddingLeft = `${level * 16 + 8}px`;

    if (node.isDirectory) {
      return (
        <div key={node.path} className="flex flex-col">
          <button
            onClick={() => toggleDirectory(node.path)}
            className="flex items-center gap-2 py-1.5 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-sm font-medium text-slate-700 dark:text-slate-300 rounded transition"
            style={{ paddingLeft }}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
            <Folder className="h-4 w-4 text-amber-500 fill-amber-500/20" />
            <span className="truncate">{node.name}</span>
          </button>
          
          {isExpanded && node.children && (
            <div className="flex flex-col mt-0.5">
              {node.children.map(child => renderNode(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={node.path}
        onClick={() => setSelectedPath(node.path)}
        className={`flex items-center gap-2 py-1.5 px-2 text-left text-sm rounded transition truncate ${
          isSelected 
            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-medium border-l-2 border-emerald-500" 
            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
        }`}
        style={{ paddingLeft: level === 0 ? "24px" : paddingLeft }}
      >
        <File className="h-4 w-4 text-slate-400" />
        <span className="truncate">{node.name}</span>
        {node.size && <span className="text-xs text-slate-400 ml-auto font-normal">{(node.size / 1024).toFixed(1)} KB</span>}
      </button>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-200px)] min-h-[500px]">
      {/* File Tree Sidebar */}
      <div className="md:col-span-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col h-full overflow-y-auto shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Code className="h-4 w-4 text-emerald-500" />
            <span>Python Source</span>
          </h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
            PEP8 compliant
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-500 border-t-transparent" />
            <span className="text-xs text-slate-400">Scanning repository...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 flex-1 select-none">
            {tree.map(node => renderNode(node))}
          </div>
        )}
      </div>

      {/* Code Viewer Panel */}
      <div className="md:col-span-3 bg-slate-950 text-slate-100 rounded-xl border border-slate-800 flex flex-col h-full shadow-lg relative overflow-hidden">
        {/* Top bar */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="ml-2 font-mono text-xs text-slate-400 select-none">{selectedPath}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={contentLoading}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 active:scale-95 transition disabled:opacity-50"
              title="Copy Code"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
            <button
              onClick={handleDownloadFile}
              disabled={contentLoading}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 active:scale-95 transition disabled:opacity-50"
              title="Download File"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed text-slate-300">
          {contentLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-500">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent" />
              <span className="text-xs">Reading module source...</span>
            </div>
          ) : (
            <pre className="whitespace-pre overflow-x-auto selection:bg-emerald-500/20">
              <code>{fileContent}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
