// var num1 = 10;
// //it goes into the whole block and gets executed there
// let num2 = 20;
// //in the sub-block

function textColor() {
    console.log("This is a function");
}
textColor();

var person = "John";
console.log(person);

if (true) {
    var person = "Jane";
    console.log(person);
}
console.log(person);

let age = 35;
if (true) {
    let age = 45;
    console.log(`The age in the if statement is ${age}`);
}
console.log(`Outside of the if statement, the age is ${age}`)

for (i=0; i<5; i++) {
    setTimeout(() => {
        console.log(`Hello World! The number is ${i}`);
    }, 100 * i);
}
