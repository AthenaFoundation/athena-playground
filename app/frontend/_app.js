
import styles from './styles/Home.module.css'
import React, {create, useEffect, useLayoutEffect, useRef, useState} from 'react';
import Editor, { DiffEditor, useMonaco, loader } from "@monaco-editor/react";


const AthenaConfig =   {
  
  keywords: ["define", "declare", "match", "check", "assert", "assume", "exists",
      "forall", "pick-witness", "pick-any", "conclude", "by-induction", "holds", "module", "open","induction"
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
  const [code, setCode] = useState(getCode())
  const [execResult, setExecResult] = useState()
  const build_editor = (editor,monaco) => {
    monaco.languages.register({id: "athena"})
    monaco.languages.setMonarchTokensProvider("athena", AthenaConfig)
    monaco.editor.defineTheme('AthenaTheme', AthenaTheme);
    monacoRef.current = monaco
    //console.log("monaco: ", monaco)
  }

  const handleCodeChange = (content, ev) => {
    //console.log("code change: ", content, ev)
    setCode(content)
    
  }
  
  const handleCodeRun = async (athCode) => {
    let res = await fetch('/athena', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ath: athCode})
    });
    //console.log(res, "<< RES")
    let rdr = res.body.getReader();
    let msg = ""
    rdr.read().then(function process({done, value}) {
      if (done) {
        let execRes = JSON.parse(msg).message
        //console.log(execRes, "<< READING COMPLETE")
        setExecResult(execRes)
      } else {
        let dcdr = new TextDecoder()
        let val = dcdr.decode(value)
        msg = msg.concat(val)
        return rdr.read().then(process)
      }
     
      
    })
  }

  const runCode = () => {
    setExecResult("Execution in progress...")
    handleCodeRun(code)
  }

  const renderExecResult = (codeToRender) => {
    if (execResult) {
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
  return (
    <div>
      <main className={styles.grid}>
        <Editor 
          theme="vs-dark"
          height="90vh"
          width="50vw"
          defaultValue={getCode()}
          language="athena"
          onMount={build_editor}
          onChange={handleCodeChange}
          path="/"
        />
        <div className={styles.shell}>
          <div className={styles.shellHeader}>
            <div onClick={() => setExecResult("")} className={styles.shellHeaderOutput}>
              <h1>Output</h1>
            </div>

            <h1 className={styles.shellHeaderFill}></h1>
          </div>

          <div><p>{renderExecResult(execResult)}</p></div>
        </div>
        <div className={styles.lowerPanel}>
          <button className={styles.runButton} onClick={runCode}>Run</button>
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
	return `module Nat {
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
    
}`
}
