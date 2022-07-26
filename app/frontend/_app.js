
import styles from './styles/Home.module.css'
import React, {create, useEffect, useLayoutEffect, useRef, useState} from 'react';
import Editor, { useMonaco, loader,  } from "@monaco-editor/react";
import {Tree, Directory} from "./tree";
import dirs from "./ath-files";

const AthenaConfig =   {
  
  keywords: ["define", "!", "force", "load", "print", "eval", "let", "domain", "declare", "match", "check", "assert", "assume", "exists",
      "forall", "chain", "absurd", "pick-witness", "pick-any", "conclude", "by-induction", "holds", "module", "open","induction"
  ],
  typeKeywords: ["datatype", "structure"],
  operators: [
    ":=", "&", "|", "=", "=>", "==>", "->", "?"
  ],
  
    
  symbols: /[:=\->&\?\|]+/,
  declarations: ["module", "extend-module"],
  tokenizer: {
    root: [
      [/[a-zA-Z\-][\w$]*/, { cases: {  '@typeKeywords': 'keyword',
                                      '@keywords': 'keyword',
                                      '@default': 'identifier',
                                      '@declarations': { token: 'keyword.decl', bracket: '@open' },
                                      '==by-induction': 'keyword'
                                  } 
                        }
      ],
      //[/\[([A-Z\s]+)\]/, 'type.identifier'],
 
      [/[{}()\[\]]/, '@brackets'],
       [/@symbols/, { cases: { '@operators': 'operator',
                              '@default'  : '' } } ],
      [/#(.*)$/, 'comment'],
      [':=', 'operator'],
      [/\d+/, 'number'],
      //[/[A-Z][\w\$]*/, 'type.identifier' ],  // to show class names nicely
      // whitespace
      //{ include: '@whitespace' },
    ],
    
  }
}

const AthenaTheme = {
  base: 'vs-dark',
  inherit: false,
  rules: [
        {token: 'keyword', foreground: 'FFA500'},
        {token: 'symbol', foreground: '345BEB'},
        {token: 'comment', foreground: 'acadb0'},
        {token: 'identifier', foreground: '3e64d6'},
        {token: 'type.identifier', foreground: '7d5bb0'},
        {token: 'operator.athena', foreground: 'FFA500'}
  ],
  colors: {
    'editor.foreground': 'ffffff'
  }
}

export default function Home() {
  const monacoRef = useRef()
  const [fileName, setFileName]   = useState("/asymmetry.ath")
  const [dirName, setDirName]     = useState("examples")
  const [code, setCode] = useState(file)
  const [execResult, setExecResult] = useState()
  const [localSave, setLocalSave] = useState(false)
  const [dirsData, setDirsData] = useState(dirs)
  const file = dirsData[dirName][fileName]
  const bottomRef = useRef(null)
  const build_editor = (editor,monaco) => {
    monaco.languages.register({id: "athena", filenames: ["asymmetry.ath", "atp.ath"], folder: true})
    monaco.languages.setMonarchTokensProvider("athena", AthenaConfig)
    monaco.editor.defineTheme('AthenaTheme', AthenaTheme);
    monacoRef.current = editor

  }
  useEffect(() => {
    // 👇️ scroll to bottom every time messages change
    if (execResult != "" && execResult != "Execution in progress...") {

      bottomRef.current?.scrollIntoView({behavior: 'smooth'});
    }
    
  }, [execResult]);

  const savePreferences = (localSave) => {
    localStorage.setItem("athena-preferences", JSON.stringify({localSave: localSave}));
  }
  const saveLocal = (dirs) => {
    localStorage.setItem("athena-local-files", JSON.stringify(dirs["/"]))
  }
  useEffect(() => {
      let saved_dirs = localStorage.getItem("athena-local-files")
      if (saved_dirs) {
        console.log("Saved dirs ", saved_dirs)
        let rootDirFiles = JSON.parse(saved_dirs);
        setDirsData( 
          
           {...dirsData, "/":  rootDirFiles}
        )
      } else {
        console.log("No saved dir found")
      }

      let preferences = localStorage.getItem("athena-preferences");
      if (preferences) {
        let locallySaving = JSON.parse(preferences);
        locallySaving = locallySaving.localSave;
        if (locallySaving) {
          setLocalSave(locallySaving);
        }
      }

      
  }, [])

  useEffect(() => {
    if (localSave) {
      console.log("Locally saving")
      saveLocal(dirsData)
    } else {
      console.log("Not locally saving")
    }
    savePreferences(localSave);
  }, [localSave, dirsData])

  useEffect(() => {
    monacoRef.current?.focus()
    setCode(file.value)
  }, [file.fname])

  const handleCodeChange = (content, ev) => {
   setCode(content)
   let new_dirs_data = {...dirsData};
   new_dirs_data[dirName][fileName] = {value: content, fname: fileName.substring(1)};
   setDirsData(new_dirs_data)
  }

  const openFile = (name) => {
    setFileName(`/${name}`)
  }
  
  const handleCodeRun = async (athCode, fname) => {
  
    let root_files = dirsData["/"];

    if (
      Object.keys(root_files).length > 1 &&
      !!root_files[fname]
    
      ) {
      console.log("Executing dir");
      console.log(`Sending files: ${root_files}`)

      let root_files_to_include = Object.assign({}, root_files)
      if (fname !== "/scratchpad.ath") {
        delete root_files_to_include["/scratchpad.ath"]
      }
        let payload = {
          file_to_run: fname.substring(1),
          files: Object.keys(root_files_to_include).map((name) => {
            let final_name = name.substring(1, name.length - 4)
            return {
              name: final_name,
              ath: root_files_to_include[name].value
            }
          })
        };

        let res = await fetch('/athena/multi-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        let rdr = res.body.getReader();
        let msg = ""
        rdr.read().then(function process({done, value}) {
          if (done) {
            let execRes = JSON.parse(msg).message
            setExecResult(execRes)
          } else {
            let dcdr = new TextDecoder()
            let val = dcdr.decode(value)
            msg = msg.concat(val)
            return rdr.read().then(process)
          }
         
          
        })
      
    } else {
      let res = await fetch('/athena', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ath: athCode})
      });
  
      let rdr = res.body.getReader();
      let msg = ""
      rdr.read().then(function process({done, value}) {
        if (done) {
          let execRes = JSON.parse(msg).message
          setExecResult(execRes)
        } else {
          let dcdr = new TextDecoder()
          let val = dcdr.decode(value)
          msg = msg.concat(val)
          return rdr.read().then(process)
        }
       
        
      })
    }
    
   
  }

  const runCode = () => {
    setExecResult("Execution in progress...")
    //openFile("atp.ath");
    handleCodeRun(code, fileName)
  }

  const renderExecResult = (codeToRender) => {
    if (execResult && execResult != "") {
      return (
        codeToRender.split("\n").map((str) => {
          return (
            <p>{str}</p>
          )
        })
      )
    } else {
      return <p></p>
    }
    
  }

  // To do: reject all invalid filenames
  // To do: append .ath to filenames that do not have them
  const addFile = (fname, save) => {
    if (fname == "") {
      return;
    } else {
      if (!dirsData["/"][`/${fname}`]) {
        dirsData["/"][`/${fname}`] = {
          fname,
          value: `module RenameMe {

          }`
        }
      }

      if (save) {
        saveLocal(dirsData)
      }
    }
  }

  const toggleLocalSave = () => {
    setLocalSave((save) => !save)
  }
  const handleFileDirClick = (fname, dirname) => {
    setDirName(dirname);
    openFile(fname);
  }
  return (
    <div>
     
      <main className={styles.grid}>
        <Directory 
          currDir={dirName} 
          rootDir="/" 
          onFileChange={(fname, dirname) => handleFileDirClick(fname, dirname) } 
          workspace={dirsData}
          onFileAdd={(fname) => addFile(fname, localSave)}
        />
        <Editor 
          theme="vs-dark"
          height="90vh"
          width="40vw"
        
          options={{minimap: {enabled: true, side: "right"}}}
          language="athena"
          onMount={build_editor}
          onChange={handleCodeChange}
          path={file.fname}
          defaultValue={file.value}
          
          
        />
        <div className={styles.shell}>
          <div className={styles.shellHeader}>
            <div onClick={() => setExecResult("")} className={styles.shellHeaderOutput}>
              <h1>Output</h1>
            </div>

            <h1 className={styles.shellHeaderFill}></h1>
          </div>

          <div className={styles.shellContent}>
            <div className={styles.execResult}>
              {renderExecResult(execResult)}
              <div ref={bottomRef} />
            </div>
          </div>
        </div>
        <div className={styles.lowerPanel}>
          <button className={styles.runButton} onClick={runCode}>Run</button>
          
          <div className={styles.panelOptions}>
            <h3 className={styles.flexTitle}>Options</h3>
            <div className={styles.panelOptionsInner}>
              <div title="Save changes to browser's local storage" className={styles.checkbox}>
                <input name="save-local" id="save-local" type="checkbox" onChange={() => toggleLocalSave()} checked={localSave} />
                <label htmlFor="save-local">Save changes locally</label>
              </div>
            </div>
          </div>
          
          
        </div>
      </main>
    </div>
  )
}

// loader.init().then(monaco => {
//   monaco.languages.register({id: "athena"})
//   monaco.languages.setLanguageConfiguration("athena", AthenaConfig)
//   monaco.editor.defineTheme('AthenaTheme', AthenaTheme);
//   const wrapper = document.getElementById("root");
//   wrapper.style.height = "80vh";
//   const properties = {
//     value: getCode(),
//     language:  "athena",
//   }
  
//   monaco.editor.create(wrapper,  properties);
// });

function getCode() {
	return `module Example {
    # Welcome to the Athena Playground!
    # Run any of the examples in here, or try writing some proofs, yourself!


    # Athena comes with many modules in its default libraries.
    # You can access those via 'load "lib-name"'. The full list of library files
    # can be found here https://github.com/AthenaFoundation/athena/tree/master/listings/lib

    # Below, you will find three examples: 
    # 1. A derivation of asymmetry
    # 2. An example of executing operations via rewrite rules
    # 3. An example of using Athena's integrations with external ATP's
    # 4. An extended example with rewriting and proofs by induction

    # Note: Running all examples at once may cause the sandbox's metering to kick in
    # If this happens, just comment-out or delete whichever example(s) are not of interest
    # Each example should complete within a few seconds

    module AsymmetryExample {
      (print "-------Asymmetry Example----------")
        domain D
        declare <: [D D] -> Boolean
      
        define [x y z] := [?x:D ?y:D ?z:D]
      
        assert* irreflexivity := (~ x < x)
        assert* transitivity := (x < y & y < z ==> x < z)
      
        conclude asymmetry := (forall x y . x < y ==> ~ y < x)
          pick-any a:D b:D
            assume (a < b)
              (!by-contradiction (~ b < a)
                assume (b < a) 
                  let {less := (!chain-> [(b < a) 
                                      ==> (a < b & b < a)    [augment]
                                      ==> (a < a)            [transitivity]]);
                       not-less := (!chain-> [true 
                                          ==> (~ a < a)      [irreflexivity]])}
                    (!absurd less not-less))
    }

    module AutomatedProofExample {
      (print "-------Automated Proof Example----------")
      declare A,B,C,D: Boolean
      assume h1 := (A & B)
      assume h2 := (~C ==> ~B)
      (!prove C [h1 h2])
    }

    module ExampleRewrite {
      (print "-------Rewrite Example----------")
      
      load "nat-plus"
       
      define + := N.+
        
      # Procedures defined in nat-plus to convert
      # integers to inductively defined natural numbers
      define one := (int->nat 1)
      define two := (int->nat 2)
      define three := (int->nat 3)
      define five := (int->nat 5)
  
      
      # Pretty print the successor number
      transform-output eval [nat->int]
      (eval two + three) # should be 5
  
      # prove 2 + 3 = 5 using the Successor representation of N
      conclude goal := ((two + three) = five)
      (!chain [
        (two + three)
                  = (S (two + two))          
                  = (S S (two + one))        
                  = (S S S (two + zero))     
                  = (S S S two)             
                  = five                     
      ])
  
    }
    module NullifyNumbersExample {
      (print "-------Nullify Numbers Example----------")
      datatype N := zero | (S N)

      declare +: [N N] -> N  [200] # precedence 200
      declare *: [N N] -> N  [300] # precedence 300
      declare **: [N N] -> N [400] # precedence 400

      declare Nul: [N] -> N

      # Some variables to use in definitions & proofs
      define [n m x y] := [?n:N ?m:N ?x:N ?y:N]
      define one := (S zero)
    
    
      # Universally quantified definitions of addition, multiplication and exponentiation
      assert* [ 
              (n + S m = S (n + m))
              (n + zero = n)
              (x * zero = zero)
              (x * (S y) = x * y + x)
              (x ** zero = one)
              (x ** S n = x * x ** n)  
      ]

      # Definitions of Nul function
      assert* nul-axioms := [(Nul S n = Nul n) (Nul zero = zero)]
      define [nul-n nul-z] := nul-axioms


      # 8 ** 3
      define eight-pow-3 := (Nul (** (S (S (S (zero))))  (S (S (S (S (S (S (S (S zero))))))))))



      # Proof that forall Natural numbers, Nul n = zero
      by-induction (forall n . Nul n = zero) {
          zero => (!chain-> [
              (Nul zero) = zero [nul-z]
          ])
          | (S n) => let {ind-hypothesis := (Nul n = zero)}
                          conclude conc := (Nul (S n) = zero)
                              (!chain-> [
                                  (Nul S n) = (Nul n) [nul-n]
                                            = zero [ind-hypothesis]
                              ])
      }

      # Proof that Nul 8 ** 3 = zero
      (!chain  [eight-pow-3 = zero [(forall n . Nul n = zero)] ])
    }
}`
}
