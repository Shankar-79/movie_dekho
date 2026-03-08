document.addEventListener("DOMContentLoaded",()=>{

const slides=document.querySelectorAll(".slide");
const dots=document.querySelectorAll(".dot");
const left=document.querySelector(".left");
const right=document.querySelector(".right");
const openingRow=document.getElementById("openingRow");
const moviesGrid=document.getElementById("moviesGrid");


let index=0;
let interval;

function showSlide(i){
slides.forEach(s=>s.classList.remove("active"));
dots.forEach(d=>d.classList.remove("active"));

slides[i].classList.add("active");
dots[i].classList.add("active");

index=i;
}

function nextSlide(){
showSlide((index+1)%slides.length);
}


function prevSlide(){
showSlide((index-1+slides.length)%slides.length);
}

function startSlider(){
interval=setInterval(nextSlide,5000);
}



function stopSlider(){
clearInterval(interval);
}


if(right) right.onclick=nextSlide;
if(left) left.onclick=prevSlide;



dots.forEach((dot,i)=>{
dot.addEventListener("click",()=>showSlide(i));
});


const slider=document.querySelector(".slider");
if(slider){
slider.addEventListener("mouseenter",stopSlider);
slider.addEventListener("mouseleave",startSlider);
}

startSlider();





const actorsData=[
{ name:"Zendaya", followers:184000000, img:"zendaya.jpeg" },
{ name:"Tom Holland", followers:67000000, img:"tomholland.jpeg" },
{ name:"Brad Pitt", followers:23000000, img:"bradpitt.jpeg" },
{ name:"Ryan Reynolds", followers:52000000, img:"ryanreynolds.jpeg" },
{ name:"Emma Stone", followers:31000000, img:"emmastone.jpeg" },
{ name:"Scarlett Johansson", followers:57000000, img:"scarlettjohansson.jpeg" },
{ name:"Chris Hemsworth", followers:59000000, img:"chrishemsworth.jpeg" },
{ name:"Margot Robbie", followers:28000000, img:"margotrobbie.jpeg" },
{ name:"Robert Downey Jr.", followers:97000000, img:"robatdowneyjr.jpeg" },
{ name:"Keanu Reeves", followers:42000000, img:"keanureeves.jpeg" },
{ name:"Jennifer Lawrence", followers:36000000, img:"jenniferlawrence.jpeg" },
{ name:"Gal Gadot", followers:108000000, img:"galgadot.jpeg" },
{ name:"Dwayne Johnson", followers:395000000, img:"dwayne.jpeg" },
{ name:"Leonardo DiCaprio", followers:65000000, img:"leonardodicaprio.jpeg" },
{ name:"Chris Evans", followers:84000000, img:"chrisevans.jpeg" }
];

const moviesData = [
{
title:"Joker",
genre:"Action • Drama",
poster:"p1.jpg",
opening:true
},
{
title:"Dune 2",
genre:"Sci-Fi • Adventure",
poster:"p2.jpg",
opening:true
},
{
title:"John Wick 5",
genre:"Action • Thriller",
poster:"p3.jpg",
opening:true
},
{
title:"Avatar 3",
genre:"Fantasy • Adventure",
poster:"p4.jpg",
opening:true
},
{
title:"Deadpool 3",
genre:"Action • Comedy",
poster:"p5.jpg",
opening:false
},
{
title:"Batman Reborn",
genre:"Action • Crime",
poster:"p6.jpg",
opening:false
},
{
title:"Spiderman Noir",
genre:"Action • Fantasy",
poster:"p7.jpg",
opening:false
},
{
title:"Ironman Legacy",
genre:"Action • Sci-Fi",
poster:"p8.jpg",
opening:false
}
];

actorsData.sort((a,b)=>b.followers-a.followers);

const topActors=actorsData.slice(0,10);



const actorRow=document.querySelector(".celebs-row");

if(actorRow){

actorRow.innerHTML="";

topActors.forEach((actor,i)=>{

const badge=i<3 ? "🔥" : "";

actorRow.innerHTML+=`
<div class="celeb-card">

<img src="../assets/actors/${actor.img}">

<div class="heart">♡</div>

<p class="rank">
${i+1} ▲ ${actor.followers.toLocaleString()}
</p>

<h4>${badge} ${actor.name}</h4>

</div>
`;

});

}
moviesData.forEach(movie=>{

if(movie.opening){

openingRow.innerHTML+=`
<img src="../assets/posters/${movie.poster}">
`;

}


moviesGrid.innerHTML+=`
<div class="movie">

<img src="../assets/posters/${movie.poster}">

<h4>${movie.title}</h4>
<p>${movie.genre}</p>

</div>
`;

});

});
