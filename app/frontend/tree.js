import React, {useState, useEffect} from 'react';

import styles from './styles/Home.module.css'
import { FaFolderPlus, FaPlusSquare, FaCaretRight, FaCaretDown } from "react-icons/fa";

export function Tree(props) {
    
    const [currFile, setCurrFile] = useState("");
    const [expanded, setExpanded] = useState(false);

    const createListing = (files, onFileChange, currDir, currDirName, expanded) => {
        if (currDir || expanded || currDirName == "/") {
            return (Object.keys(files).map((file) => {
                let fname = files[file].fname;
                if (files[file] !== "") {
                    return (
                        <button className={currDirName == "/" ? styles.rootFileButton : styles.treeButton} onClick={() => onFileChange(fname, currDirName)}>{fname}</button>
                    )
                }
                
            }))
        } 
        
    }
    return (
        <div>
            {
                props.rootDir != "/" && 
                <h3 className={styles.dirHeader}>{props.rootDir} 
                {(props.currDir || expanded) && 
                    <FaCaretDown 
                        className={styles.folderControlIcon} size={"20"}
                        onClick={() => setExpanded(!expanded)}
                    />
                }
                {(!props.currDir && !expanded) && 
                    <FaCaretRight
                        onClick={() => setExpanded(!expanded)}
                        className={styles.folderControlIcon} size={"20"}
                    />
                }
            </h3>
            }
            
            {createListing(props.files, props.onFileChange, props.currDir, props.rootDir, expanded)}
        </div>
    )
}

// Dirs is an object whose keys are dirnames, and whose values are "files" object
export function Directory(props) {
    const [newFileForm, setNewFileForm] = useState()
    const [newFileName, setNewFileName] = useState("")
    const renderTrees = (dirs) => {
        return (Object.keys(dirs).map((dirname) => {
            return (
                <Tree 
                    onFileChange={props.onFileChange}
                    rootDir={dirname}
                    files={dirs[dirname]}
                    currDir={props.currDir == dirname}
                />
            )
        }))
    }

    const handleNewFile = (fname) => {
        setNewFileName("")
        setNewFileForm(false)
        props.onFileAdd(fname)
    }
    const renderHeading = (showForm) => {
        if (showForm) {
            return  (
                <form onSubmit={() => handleNewFile(newFileName)}>
                    <input type="text" onChange={(e) => setNewFileName(e.target.value)} placeholder="File name" title="Enter file name"/>
                </form>
                
            )
        } else {
            return (<div className={styles.icons}>
               <FaPlusSquare onClick={() => setNewFileForm(true)} className={styles.icon}  size={"30"} title="New file"/>
                </div>)
        }
    }
    return (
        <div className={styles.tree}>
            <div className={styles.treeHeader}>
                <h2>Athena Playground</h2>
                {
                   renderHeading(newFileForm)
                }
                
                
            </div>
           
            {renderTrees(props.workspace)}
        </div>
        
    )
}

const createFileListingItems = (files, onClick) => {
    Object.keys(files).map((file) => {
        

        return (
            <FileNameListing fname={file.fname} onClick={onClick} />
        )
    })
}

function FileNameListing(props) {
   

    const handleFileClick = () => {
        onClick(props.fname)
    }

    return (
        <button onClick={props.handleFileClick}>{props.fname}</button>
    )
}