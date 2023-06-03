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
    "/first-order-logic-1.ath": {
        fname: "first-order-logic-1.ath",
        value: 
        `# Show that if P always implies Q, then ~Q(a) implies ~P(a):

domain D
declare P,Q: [D] -> Boolean
declare a: D

# Proof in chaining style:

assume P-implies-Q := (forall x . P x ==> Q x)
    assume (~ Q a)
    (!by-contradiction (~ P a) 
        (!chain [(P a) ==> (Q a)         [P-implies-Q]
                    ==> false         [(absurd with (~ Q a))]]))

# Or in one step using ATPs: 
(!prove ((forall x . P x ==> Q x) ==> ~ Q a ==> ~ P a) (ab))`
    },
    "/list-assoc.ath": {
        fname: "list-assoc.ath",
        value:
        `declare ++: (S) [(List S) (List S)] -> (List S)

# Let's assert the datatype axioms for lists: 
assert* (datatype-axioms "List")

define [l l1 l2 l3 h t] := [?l ?l1 ?l2 ?l3 ?h ?t]

# Let's define a concatenation operation on polymorphic lists
# using recursion:

assert* ++-def :=
    [(nil ++ l = l)
        (h::t ++ l = h::(t ++ l))]

# We may now wonder if the operation is associative:

define ++-assoc :=
    (forall l1 l2 l3 . l1 ++ (l2 ++ l3) = (l1 ++ l2) ++ l3)

(falsify ++-assoc 10)

# We were not able to falsify it in a small score,
# so let's try to prove it automatically: 

(!list-induction ++-assoc)`
    },
    "/first-order-logic-2.ath": {
        fname: "first-order-logic-2.ath",
        value:
        `domain D
declare P,Q: [D] -> Boolean
declare R: [D D] -> Boolean

assert premise-1 := (exists x . P x)
assert premise-2 := (exists x . Q x)
assert premise-3 := (forall x . P x ==> forall y . Q y ==> x R y)

# We'll conclude that R is non-empty: 

conclude goal := (exists x y . x R y)
    pick-witness a for premise-1    # We now have (P a)
        pick-witness b for premise-2  # We now have (Q b)
            (!chain-> [(P a) ==> (forall y . Q y ==> a R y) [premise-3]
                             ==> (Q b ==> a R b)            [(uspec with b)]
                             ==> (a R b)                    [(mp with (Q b))]
                             ==> goal                       [existence]])`

    },
    "/first-order-logic-3.ath": {
        fname: "first-order-logic-3.ath",
        value:
        `# Here we derive the formula known as Russell's paradox. 

domain D
declare R: [D D] -> Boolean

conclude goal := (~ exists x . forall y . y R x <==> ~ y R y)
    (!by-contradiction goal
    # By contradiction, assume that such an individual exists: 
    assume hyp := (exists x . forall y . y R x <==> ~ y R y)
    # Call that individual w: 
        pick-witness w for hyp 
        let {w-characterization := (forall y . y R w <==> ~ y R y);
            # w-characterization is already in the assumption base,
                # so let's apply it to w itself: 
                w-lemma := conclude (w R w <==> ~ w R w)
                        (!instance w-characterization w)}
            # Now we have a contradiction, which we can show more explicitly
        # by a case analysis:
            (!two-cases
                assume (w R w)
                    (!chain-> [(w R w) ==> (~ w R w) [w-lemma]
                                       ==> false     [(absurd with (w R w))]])
                assume (~ w R w)			 
                    (!chain-> [(~ w R w) ==> (w R w) [w-lemma]
                                         ==> false   [(absurd with (~ w R w))]])))
        `
    },
    "/tree-reflection.ath": {
        fname: "tree-reflection.ath",
        value:
        `#****************************************************************************************************************

# Define a polymorphic datatype for binary trees:

datatype (BTree S) := null
                    | (node S (BTree S) (BTree S))

# The function reflect take a tree and recursively reflects it:

declare reflect: (S) [(BTree S)] -> (BTree S)

define [t t' t1 t2 ] := [?t ?t' ?t1 ?t2]

# Let's define this function:

assert* reflect-def :=
    [(reflect null = null)
    (reflect (node x t1 t2) = (node x (reflect t2) (reflect t1)))]

# A shorthand for making leaves: 

define (leaf x) := (node x null null) 

# Let's test our definitions:

define simple-tree := (node 1 (leaf 2) (leaf 3))

# So simple-tree is this: 
#              1
#           2     3
#

(eval reflect simple-tree)

# The above should yield:
#              1
#           3     2
#
# or (node 1 (node 3 null null) (node 2 null null)) in linear notation

# And now let's prove a simple result: reflecting t twice gives back t.

define reflect-twice-is-identity := (forall t . reflect reflect t = t)

(falsify reflect-twice-is-identity 100)

by-induction reflect-twice-is-identity {
    (t as null) =>
        (!chain [(reflect reflect t)
            = (reflect t)          [reflect-def]
            = t                    [reflect-def]])
            
| (t as ( node x left right)) =>
        let {[ih1 ih2 ] := [(reflect reflect left = left)
                        (reflect reflect right = right)]}
            (!chain [(reflect reflect t)
                        = (reflect (node x (reflect right)
                                            (reflect left)))    [reflect-def]
                        = (node x (reflect reflect left)
                                (reflect reflect right))     [reflect-def]
                        = (node x left right)                  [ih1 ih2]])			   
}

        `
    },
    "/zol-1.ath": {
        fname: "zol-1.ath",
        value:
        `declare A,B,C: Boolean

assert prem-1 := (A ==> B ==> C)
assert prem-2 := (~ (B ==> C))

conclude (~ A)
    (!by-contradiction (~ A)
    assume A
        (!chain-> [A ==> (B ==> C) [prem-1]
                    ==> false     [(absurd with prem-2)]]))`
    },
    "/zol-1.ath": {
        fname: "zol-1.ath",
        value:
        `declare A,B,C,D,E,F,G,H,I: Boolean

assert p1 := (A | B ==> C & D )
assert p2 := (C | E ==> ~ F & G)
assert p3 := (F | H ==> A & I)

# We will show that the negation of F is a logical consequence
# of these 3 premises. We'll derive (~ F) by contradiction, by
# assuming F: 

(!by-contradiction (~ F)
    assume F
        (!chain-> [F ==> (F | H)   [alternate]
                    ==> (A & I)   [p3]
            ==> A         [left-and]
            ==> (A | B)   [alternate]
            ==> (C & D)   [p1]
            ==> C         [left-and]
            ==> (C | E)   [alternate]
            ==> (~ F & G) [p2]
            ==> (~ F)     [left-and]
            ==> false     [(absurd with F)]]))`
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
}`},
"/pelletier-63.ath": {
    fname: "pelletier-63.ath",
    value:
`#---------------------------------------------------------------------------------
# Pelletier problem 63 (From Pelletier's 75 Problems for Testing ATP's)
#---------------------------------------------------------------------------------

domain D
declare ++:[D D] -> D
declare a: D

assert* axiom-1 := (x ++ (y ++ z) = (x ++ y) ++ z)
assert* axiom-2 := (a ++ x = x)
assert* axiom-3 := (forall x . exists y . y ++ x = a)

define goal := (forall x y z . x ++ y = z ++ y ==> x = z)

(!derive-from goal [axiom-1 axiom-2 axiom-3] |{'atp := 'vampire, 'max-time := 100}|)`
},
    "/pigeonhole-atp.ath": {
        fname: "pigeonhole-atp.ath",
        value:
`
#---------------------------------------------------------------------------------
# PIGEONHOLE PRINCIPLE ENCODED IN PROPOSITIONAL LOGIC   
# ---------------------------------------------------------------------------------

datatype Object := (object Int)

datatype Box := (box Int)

declare inside: [Object Box] -> Boolean

# Let's define two functions that take a number n > 1 and produce sentences claiming two things:
# (1) Every object 1, ...n, n+1 is located in one of the n boxes (box 1, box 2, ..., box n).
# (2) If  object x is inside box b (for x in [1,..,n,n+1] and b in [1,...n]) then no other object
# y in also in b.

define (all-somewhere n) :=
  (and (map (lambda (x)
              (or (map (lambda (b)
                     (object x inside box b))
                 (from-to 1 n))))
            (from-to 1 (n plus 1))))

define (none-together n) :=
  (and (map (lambda (x)
              (and (map (lambda (b)
                      (if (object x inside box b)
                  (and (map (lambda (y)
                               (~ object y inside box b))
                            (list-remove x (from-to 1 (plus 1 n)))))))
                 (from-to 1 n))))
            (from-to 1 (n plus 1))))


# Then the pigeonhole principle is simply the assertion that the conjunction of
# these two sentences is inconsistent:

define (pigeonhole n) := (all-somewhere n & none-together n ==> false)

# Let's derive this automatically for n = 10 using Vampire:

(!derive-from (pigeonhole 10) [] |{'atp := 'vampire, 'max-time := 100}|)`
    }
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
    "Examples": files,
    "/": rootFiles,
};

export default dirs;