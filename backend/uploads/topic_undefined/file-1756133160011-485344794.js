// TYPES OF LOOPS : 
// for, for in, for of, while, do while 

// 1st : pgm to add n natural numbers
// let sum =0;
// let n = 12 


// for (let i = 0; i < n; i++) {
//     sum += i+1;
//     console.log("natural numbers are: ", i+1)
// }

// console.log("sum of the given n natural numbers :: " + sum)

// 2nd
// let person ={
//     name : "John",
//     age:25,
//     country:"Norway",
//     job:"developer"
// };

// for(let key in person){
//     console.log(key + " : " + person[key]);
// }

// 3rd
let numbers = [1,2,3,4,5,6,7,8];
for(let num in numbers){
    console.log(num);
}
