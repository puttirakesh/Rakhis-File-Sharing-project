let first,second,third;

r1 = Math.random();
r2 = Math.random();
r3 = Math.random();

if (r1 > 0.66 && r1 <= 1) {
    first = "Fire";
    console.log("Your character's type is: " + first);
}

if (r2 < 0.33) {
    second = "Water";
    console.log("Your character's type is: " + second);
}

if (r2 > 0.66 && r2 <= 1) {
    second = "Land";
    console.log("Your character's element is also Land.");
}

if (r3 <= 0.33) {
    third = "Air";
    console.log("Your charecter's element is :" + third);
}

if(r3 >0.33 && r3 <= 0.66){
    third = "Earth";
    console.log("Your character's element is Earth.")
}

if (r3 > 0.66 && r3 <= 1){
    third = "Fox"
    console.log();
}

console.log(first + " " + second + " " + third);
