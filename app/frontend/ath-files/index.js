let files = {
    "/asymmetry.ath": {
      fname: "asymmetry.ath",
      value: `
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
}`
},
  
    "/automated-proving.ath": {
      fname: "automated-proving.ath",
      value: 
    `module AutomatedProofExample {
      (print "-------Automated Proof Example----------")
      declare A,B,C,D: Boolean
      assume h1 := (A & B)
      assume h2 := (~C ==> ~B)
      (!prove C [h1 h2])
}`}
  };
  
  let tutorialFiles = {
    "/step1_inductive_proof.ath": {
        fname: "step1_inductive_proof.ath",
        value: `load "nat-minus"
load "nat-minus"
module Factorial {

    define [< - * one <=] := [N.< N.- N.* N.one N.<= ]

    declare factorial: [N] -> N [[int->nat]]
    (transform-output eval [nat->int])
    
    assert f_zero := (forall x . x = zero ==> factorial x = one)

    assert f_x := (forall x . one < x ==> (factorial x) = (x * (factorial (x - one))))

    assert f_one := (forall x . one = x ==> (factorial x) = one)

    (eval (factorial 4))
    (eval (factorial 5))

    define nothing-less-than-zero := (forall x . ~ x < zero)
    
    define f_x_less_than := (forall x . factorial (x - one) <= factorial x )
    define lte-def := (forall x y . (x <= y <==> x < y | x = y))

    by-induction f_x_less_than {
        zero => conclude base_case := (factorial (zero - one) <= factorial zero)
                    (!force base_case)
                        
                    
        | (m as (S n)) => conclude inductive_step := ((factorial (m - one)) <= (factorial m))
                    (!force inductive_step)
    }
}`
    },
    "/step2_inductive_proof.ath": {
        fname: "step2_inductive_proof.ath",
        value: `load "nat-minus"
module Factorial {

    define [< - * one <=] := [N.< N.- N.* N.one N.<= ]

    declare factorial: [N] -> N [[int->nat]]
    (transform-output eval [nat->int])
    
    assert f_zero := (forall x . x = zero ==> factorial x = one)

    assert f_x := (forall x . one < x ==> (factorial x) = (x * (factorial (x - one))))

    assert f_one := (forall x . one = x ==> (factorial x) = one)

    (eval (factorial 4))
    (eval (factorial 5))

    define nothing-less-than-zero := (forall x . ~ x < zero)
    
    define f_x_less_than := (forall x . factorial (x - one) <= factorial x )
    define [lte-def] := N.Less=.<=-def

    by-induction f_x_less_than {
        zero => conclude base_case := (factorial (zero - one) <= factorial zero)
                        let {
                            zero-lt-one := (!chain-> [true ==> (zero < (S zero)) [N.Less.zero<S] ==> (zero < one) [(one = (S zero))]]);
                            zero<one_or_zero=one := (!left-either (zero < one) (zero = one));
                            f_zero-1_eq_f_zero := (!chain [
                                (factorial (zero - one))
                                    = (factorial zero)  [N.Minus.zero-left] 
                            ]);
                            f_zero-1_eq_or_lt_f_zero := (!right-either (factorial (zero - one) < (factorial zero))  f_zero-1_eq_f_zero)
                        }
                        (!mp (!right-iff (!uspec* lte-def [(factorial (zero - one)) (factorial zero) ])) f_zero-1_eq_or_lt_f_zero)
                        
                    
        | (m as (S n)) => conclude inductive_step := ((factorial (m - one)) <= (factorial m))
                    let {
                        ih := ((factorial (n - one)) <= (factorial n));
                        _ := (!claim ih)
                    }
                    (!force inductive_step)
    }
}`
    }
  }

let rootFiles = {
    "/scratchpad.ath": {
        fname: "scratchpad.ath",
        value: ` # Write your Athena code here
module MyModule {
    domain ExampleDomain
    declare ExamplePredicate: [ExampleDomain] -> Boolean
}
        `
    }
}
  
let dirs = {
    "examples": files,
    "tutorials": tutorialFiles,
    "/": rootFiles,
};

export default dirs;