var arr = [1,"hello",3,true, [2, "world"]];

var str = JSON.stringify(arr);
console.log("myarray : "+str);

arr.push("Rakhi", 13);
console.log(arr);

arr.pop();
console.log(arr);

arr.shift(); //removes the first element of an array
console.log(arr);

arr.unshift("Rakhi"); //adds a new item to the array
console.log(arr);


console.log(arr.slice(0,2));
//splice() method is used to add or remove items from an array at any index
//Syntax: arr.splice(index