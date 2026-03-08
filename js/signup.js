const form=document.getElementById("signupForm");

form.addEventListener("submit",(e)=>{
e.preventDefault();

const username=form.username.value.trim();
const email=form.email.value.trim();
const password=form.password.value.trim();



if(username==="" || email==="" || password===""){
alert("Fill all fields");
return;
}

if(password.length<4){
alert("Password must be at least 4 characters");
return;
}




const userData={
username,
email,
password
};

localStorage.setItem("userAccount", JSON.stringify(userData));

alert("Signup successful! Please login.");



window.location.href="login.html";

});