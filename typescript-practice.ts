/* ----------------------------- simple type inference ------------------------ */

// https://www.typescriptlang.org/docs/handbook/variable-declarations.html
// the way typescript calculates a type isn't always quite what you expect
// where do we sometimes see errors like this? why do we sometimes need `as const` in our codebase?

function doSomething(o: DontUseThisTypeToFix) {}
type DontUseThisTypeToFix = {
  method: "GET" | "PUT";
};

// these work
const optionsWorking: DontUseThisTypeToFix = { method: "PUT" };
doSomething(optionsWorking);
doSomething({ method: "GET" });

// but this doesn't
// why?
const options = { method: "GET" };
doSomething(options);

// this also fails. what's going on?
let method = "GET";
doSomething({ method });

// but this works
let method2 = "GET" as const;
doSomething({ method: method2 });

// as does this
const method3 = "GET";
doSomething({ method: method3 });

/* ----------------------- array type inference ------------------------ */
// shoutout to Chris for this section!!

const mixedArray = ["string", 2];
// why does this error?
mixedArray.push(new Date());

// what type do we end up with here? (hover over `mixedObjectArray`)
// what ways do we have to tell typescript we have a different type in mind?
const mixedObjectArray = [{ a: 1 }, { b: 1 }];

// why does this error?
mixedObjectArray.push({ c: 1 });

type IndexFields = Record<string, number>;

// Function accepts an array of objects with dynamic keys
declare function takesIndexFields(indexFields: IndexFields[]): void;

// this fails
takesIndexFields(mixedObjectArray);
// but this works. why?
takesIndexFields([
  {
    a: 1,
  },
  {
    b: 1,
  },
]);

/* ----------------------- structural typing ------------------------- */

type Cat = {
  is_animal: true;
};

type Dog = {
  is_animal: true;
};

const dog: Dog = { is_animal: true };
const cat: Cat = dog;

/* ----------------------- what does 'as' do? ----------------------- */
// every time you use "as" you're telling the type system "I KNOW BETTER THAN YOU DO"
// and you normally don't!

// how do we make this error correctly??
type Greeting = "hello" | "hey";
const notHello = "farewell" as Greeting;
declare function takesGreeting(s: Greeting): void;
takesGreeting(notHello);

// scary, huh?
// using 'as' is dangerous!
const notATeacher = {} as Teacher;

/* ----------------------- narrowing ------------------------- */
// https://www.typescriptlang.org/docs/handbook/2/narrowing.html
// we don't always help typescript do type narrowing in our codebase
// and it often leads to code with lots of "as X" or "if ((z as X).type === "foo")..."
// that's almost always a sign that we've screwed up our types somehow
// in general, if you're often writing `as Y` or using `!`, you may not be narrowing types correctly

type SchoolLeader = Teacher & { role: "school_leader" };
// update this function to make the if statement narrow properly :) ("is")
function isSchoolLeader(teacher: Teacher) {
  return teacher.role === "school_leader";
}
const maybeSchoolLeader: Teacher = { type: "teacher", role: "school_leader" };
if (isSchoolLeader(maybeSchoolLeader)) {
  const schoolLeader: SchoolLeader = maybeSchoolLeader;
  console.log("school_leader", schoolLeader);
}

class NotFoundError extends Error {
  type: "NotFound";
  constructor() {
    super();
    this.type = "NotFound";
  }
}

class NotAllowedAccessError extends Error {
  type: "NoAccess";
  constructor() {
    super();
    this.type = "NoAccess";
  }
}

class AuroraTimeoutError extends Error {
  type: "AuroraTimeout";
  table?: string;
  constructor(table?: string) {
    super();
    this.type = "AuroraTimeout";
    this.table = table;
  }
}

// how could we change this function to type it nicely?
function getResponseFromError(
  err: NotFoundError | NotAllowedAccessError | AuroraTimeoutError | Error
): { status: number; body?: string } {
  if (err.type === "AuroraTimeout") {
    return {
      status: 500,
      body: `aurora timed out: ${!!err.table ? err.table : "unknown table"}`,
    };
  }

  if (err.type === "NoAccess") {
    return { status: 403, body: "no access to that thing" };
  }

  if (err.type === "NotFound") {
    return { status: 404, body: "not found" };
  }

  if (!err.type) {
    return { status: 500, body: "internal server error" };
  }

  throw new Error(`Unknown error type ${err.type}`);
}

/* ----------------------- typing functions to handle multiple input types ------------------------- */
// https://www.typescriptlang.org/docs/handbook/functions.html#overloads

type Teacher = { type: "teacher"; role?: string };
type Parent = { type: "parent" };
type Entity = Teacher | Parent;

// how do set up `renderEntity` to preserve the type of its input?
function renderEntityWithGenerics<T extends Entity>(entity: Entity) {
  return entity;
}
const teacher: Teacher = renderEntityWithGenerics({ type: "teacher" });

// make sure this errors!
renderEntityWithGenerics({ type: "not an entity" });

// could you solve this without using generics and using multiple function definitions?
function renderEntityWithMultipleDefinitions(entity: Entity) {
  return entity;
}
const parent2: Parent = renderEntityWithMultipleDefinitions({ type: "parent" });

// make sure this errors!
const notAnEntity = renderEntityWithMultipleDefinitions({
  type: "not an entity",
});

function swapStringsAndNumbers(a: string | number) {
  if (typeof a === "string") return parseInt(a);
  return a.toLocaleString();
}
// how do we get n to autmoatically show up as a number? (don't use `as number`)
const n: number = swapStringsAndNumbers("100");
const s: string = swapStringsAndNumbers(1000);

/* ----------------------- brands ------------------------- */
// why would we want an "impossible" type like this EmailAddress?
type EmailAddress = string & { __secret_brand: "email address" };
function asEmail(emailAddress: string) {
  if (!emailAddress.includes("@")) throw new Error("not an email");
  return emailAddress;
}
const email: EmailAddress = asEmail("email@classdojo.com");

// extra credit: how would you set up a `Brand<T, Name>` that allows branding arbitrary strings or numbers?

/* ----------------------- interface vs type ------------------------- */

// so, what is the difference between an 'interface' and a 'type'?

/*

interface:
  - can be extended `interface X extends Y {}`
  - can be augmented by declaring the interface again
  ```
    interface A {}
    interface A {
      extraProp: string;
    }
  ```
  - useful for libraries, or typing a method like `console.plog` that augments something that already exists (https://github.com/classdojo/api/blob/1261a407440dbbfe10bda43a327d6d1468145df5/src/console.ts#L69)
  - has "strict" index signatures
    if you set up `inferface A {a: 1}`, it doesn't infer the "index signature" of A, so it doesn't know that it'd be usable by something that takes something indexed by strings

type:
  - is an "alias" for a shape
  - "extended" by creating a new type alias: `type B = Omit<A, C>;`
  - cannot be augmented without creating a new type `type B = A & { extraProp: string }`

useful discussion: https://github.com/microsoft/TypeScript/issues/15300#issuecomment-332366024

in general, use 'type' for internal shapes (i.e. shapes within API), and 'interface' for library types that may need be augmented in a different codebase

*/

// what shape should A be?
const a: AugmentedInterface = {};

interface AugmentedInterface {}
interface AugmentedInterface {
  extraProp: string;
}
interface AugmentedInterface {
  anotherProp: boolean;
}

interface LimitOptions {
  limit: number;
}
declare function takesDict(options: Record<string, number>): void;
const limitOptions: LimitOptions = { limit: 2 };
takesDict(limitOptions);

// general vs. specific is adapted from https://github.com/microsoft/TypeScript/issues/15300#issuecomment-371353444
// there are some great examples in that comment!
interface GeneralInterface {
  [key: string]: number;
}
interface MoreSpecificInterface {
  myKey: number;
}

const specific: MoreSpecificInterface = { myKey: 1 };
const general: GeneralInterface = specific;

// going in the other direction, an interface taking a type alias does work!
interface QueryOptions extends LimitOptions {
  sort: 1 | -1;
}
type QueryOptionsType = {
  limit: number;
  sort: 1 | -1;
  extraParameterNotInInterface: string;
};
declare function takesInterface(options: QueryOptions): void;
const queryOptions: QueryOptionsType = {
  limit: 3,
  sort: -1,
  extraParameterNotInInterface: "hello",
};
takesInterface(queryOptions);

/* ----------------------------- function utilities ------------------------ */
// https://www.typescriptlang.org/docs/handbook/utility-types.html Parameters, typeof, ReturnType

type AnyFunction = (...args: any[]) => any;
const createSpyFunctionPreservingTypes = <T extends AnyFunction>(fn: T) => {
  let callCount = 0;

  // add types here to make the spied functions share the same types as the passed in function
  const spyFunction = (...args: any[]) => {
    callCount++;
    return fn(...args);
  };

  spyFunction.getCallCount = () => callCount;

  return spyFunction;
};

const stringFunction = (key: string) => key;

// this is erroring the way it should!
stringFunction(1);

const numberFunction = (n: number) => n;
// same here! we want to see this error
numberFunction("string");

const spiedStringFunction = createSpyFunctionPreservingTypes(stringFunction);
type SpyHint = typeof spiedStringFunction;

spiedStringFunction(1);
createSpyFunctionPreservingTypes(numberFunction)("string");

type TimeoutRef = "fix me without importing any types :)";
class HowCanWeGetTimeoutType {
  private timeoutRef: TimeoutRef;

  constructor() {
    this.timeoutRef = setImmediate(() => {
      console.log("well done!");
    });
  }
}

/* ----------------------------- type utilities ------------------------ */
{
  // https://www.typescriptlang.org/docs/handbook/utility-types.html
  // it's a little hard to contstruct nicely failing tests here
  // and it's worth reading the utility types carefully! they're useful :)
  type EntityType = "teacher" | "parent" | "school_leader" | "student";

  // how do you type the return type by manipulating `EntityType`?
  function isAdult(entityType: EntityType) {
    return ["teacher", "parent", "school_leader"].includes(entityType);
  }

  function onlyTakesStudents(entityType: "student") {}

  function doThing(entityType: EntityType) {
    if (isAdult(entityType)) {
      // do nothing
    } else {
      onlyTakesStudents(entityType);
    }
  }
}

/* ------------------------ exhaustive switch ------------------- */
{
  // https://stackoverflow.com/questions/39419170/how-do-i-check-that-a-switch-block-is-exhaustive-in-typescript
  function assertImpossible(p: never): never {
    throw new Error("INCONCEIVABLE!");
  }

  type Method = "GET" | "PUT" | "POST" | "DELETE";

  function handleMethod(method: Method) {
    switch (method) {
      case "GET":
        return 1;
      case "PUT":
        return 2;
      case "POST":
        return 3;
      default:
        assertImpossible(method);
    }
  }

  // stolen from https://stackoverflow.com/questions/39419170/how-do-i-check-that-a-switch-block-is-exhaustive-in-typescript
  // Discriminated union using string literals
  type Teacher = {
    type: "teacher";
    role: string;
  };
  type Parent = {
    type: "parent";
    children: Array<string>;
  };
  type StudentUser = {
    type: "studentUser";
    monster: string;
  };
  type Entity = Teacher | Parent | StudentUser;

  function handleEntity(entity: Entity) {
    switch (entity.type) {
      case "teacher":
        console.log(entity.role);
        break;
      case "parent":
        console.log(entity.children.length);
        break;
      default:
        assertImpossible(entity);
    }
  }

  function handleEntityWithIfStatements(entity: Entity) {
    if (entity.type === "teacher") {
      console.log(entity.role);
    } else if (entity.type === "parent") {
      console.log(entity.children);
    } else {
      assertImpossible(entity);
    }

    // we looked at this one earlier
    // once we check that "type" exists within 'err', it's able to safely discriminate using the 'type' key
    function getResponseFromError(
      err: NotFoundError | NotAllowedAccessError | AuroraTimeoutError | Error
    ): { status: number; body?: string } {
      if (!("type" in err)) return;
      if (err.type === "AuroraTimeout") {
        return {
          status: 500,
          body: `aurora timed out: ${
            !!err.table ? err.table : "unknown table"
          }`,
        };
      }

      if (err.type === "NoAccess") {
        return { status: 403, body: "no access to that thing" };
      }

      if (err.type === "NotFound") {
        return { status: 404, body: "not found" };
      }

      assertImpossible(err);
    }
  }
}
/* ------------------------ typeof, keyof, in, extends --------------------- */
{
  const objectWithKeys = { a: 1, b: 2, c: [1, 2, 3] };
  type Ex1 = keyof typeof objectWithKeys;
  type Ex2 = {
    [key in keyof typeof objectWithKeys]: keyof [];
  };

  type Method = "GET" | "PUT" | "POST" | "DELETE";
  type Handler = Record<Method, () => number>;
  type Handler2 = {
    [key in Method]: () => number;
  };
  const handler: Handler = {
    GET: () => 1,
    PUT: () => 2,
    POST: () => 3,
  };

  // we _know_ handler has GET, PUT, POST, and DELETE as its keys
  function getKeys<T extends Record<string, any>>(o: T) {
    return Object.keys(handler);
  }
  // but keys isn't happy. How can we set up the return type of `getKeys` to preserve the type
  // note: we'll have to override typescript in `getKeys`!
  const keys: Method[] = getKeys(handler);
}

/* -------------------- NEXT LEVEL -------------------- */

// https://github.com/type-challenges/type-challenges/blob/master/questions/4-easy-pick/README.md
// https://github.com/type-challenges/type-challenges/blob/master/questions/11-easy-tuple-to-object/README.md
// https://github.com/type-challenges/type-challenges/blob/master/questions/189-easy-awaited/README.md

/* ----------------------------- more learning resources ------------------------ */

// https://github.com/type-challenges/type-challenges has an amazing set of challenges
// https://www.amazon.com/Effective-TypeScript-Specific-Ways-Improve/dp/1492053740/ has some good actionable advice
