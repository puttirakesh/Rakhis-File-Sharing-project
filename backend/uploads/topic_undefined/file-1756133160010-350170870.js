var currentDate = new Date();
console.log(currentDate);

/*var monthNames = ["January","February", "March", "April", "May", "June" ,
  "July", "August", "September", "October", "November", "December"];*/

var date = new Date();
date.setDate(9); 
// Sets the day of the month to  the current day.
date.setFullYear(2004); //Sets the year to 2004

date.setMonth(11);
// date.setMonth(monthNames.indexOf("October")); // Set the month to October (9).
console.log(date);

