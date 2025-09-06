var str1 = "Hello World";
var str2 = "Rakhi";

console.log(str1.concat(str2)); // Hello WorldRakhi
console.log(str1 + "" + str2); // Hello WorldRakhi

console.log(str1.indexOf("R"));

console.log(str1.slice(7));

console.log(str1.replace("World", "Friend")); 

console.log(str2.toLowerCase());
console.log(str2.toUpperCase());

// String comparison using == operator
if (str1 == str2) {
    console.log("Strings are equal");
} else {
    console.log("Strings are not equal");
}