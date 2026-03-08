const form=document.querySelector("form");

form.addEventListener("submit",(e)=>{
e.preventDefault();

const email=form.email.value;
const pass=form.password.value;

const savedUser=JSON.parse(localStorage.getItem("userAccount"));

if(!savedUser){
alert("No account found. Please signup first.");
return;
}

if(email===savedUser.email && pass===savedUser.password){

localStorage.setItem("user", savedUser.username);
window.location.href="index.html";

}else{
alert("Invalid email or password");
}

});