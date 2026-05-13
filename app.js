const PRODUCTS_API="https://copen.app.n8n.cloud/webhook/patae/products";
const LIFF_ID="PUT_YOUR_LIFF_ID_HERE";

let allProducts=[];
let currentCategory=null;
let cart={};

async function initLiff(){
try{
if(LIFF_ID!=="PUT_YOUR_LIFF_ID_HERE"){
await liff.init({liffId:LIFF_ID});
}
}catch(err){console.error(err);}
}

async function loadProducts(){
const res=await fetch(PRODUCTS_API);
const data=await res.json();
allProducts=data.products||[];
buildTabs();
renderProducts();
}

function buildTabs(){
const tabs=document.getElementById("category-tabs");
const categories=[...new Set(allProducts.map(p=>p.category))];

categories.forEach(cat=>{
const btn=document.createElement("button");
btn.innerText=cat;

if(!currentCategory){
currentCategory=cat;
btn.classList.add("active");
}

btn.onclick=()=>{
currentCategory=cat;
document.querySelectorAll(".tabs button").forEach(b=>b.classList.remove("active"));
btn.classList.add("active");
renderProducts();
};

tabs.appendChild(btn);
});
}

function renderProducts(){
const container=document.getElementById("products");
container.innerHTML="";

const products=allProducts.filter(p=>p.category===currentCategory);

products.forEach(product=>{
const qty=cart[product.product_id]?.qty||0;

const card=document.createElement("div");
card.className="card";

card.innerHTML=`
<img src="${product.image_url}">
<div class="card-content">
<h3>${product.product_name}</h3>
<div class="price">${product.price} บาท</div>
<div class="qty-row">
<button onclick="decreaseQty('${product.product_id}')">-</button>
<span>${qty}</span>
<button onclick="increaseQty('${product.product_id}')">+</button>
</div>
</div>
`;

container.appendChild(card);
});
}

function increaseQty(productId){
const product=allProducts.find(p=>p.product_id===productId);

if(!cart[productId]){
cart[productId]={...product,qty:0};
}

cart[productId].qty++;
updateCart();
renderProducts();
}

function decreaseQty(productId){
if(!cart[productId]) return;
cart[productId].qty--;

if(cart[productId].qty<=0){
delete cart[productId];
}

updateCart();
renderProducts();
}

function updateCart(){
const items=Object.values(cart);

const totalQty=items.reduce((sum,i)=>sum+i.qty,0);
const totalAmount=items.reduce((sum,i)=>sum+(i.qty*i.price),0);

document.getElementById("cart-count").innerText=totalQty;
document.getElementById("cart-total").innerText=totalAmount;
document.getElementById("modal-total").innerText=totalAmount;

renderCartItems();
}

function renderCartItems(){
const container=document.getElementById("cart-items");
container.innerHTML="";

Object.values(cart).forEach(item=>{
const div=document.createElement("div");
div.className="cart-item";

div.innerHTML=`
<strong>${item.product_name}</strong><br/>
Qty: ${item.qty}<br/>
Total: ${item.qty*item.price} บาท
`;

container.appendChild(div);
});
}

document.getElementById("view-cart-btn").onclick=()=>{
document.getElementById("cart-modal").classList.remove("hidden");
};

document.getElementById("close-cart-btn").onclick=()=>{
document.getElementById("cart-modal").classList.add("hidden");
};

document.getElementById("checkout-btn").onclick=()=>{
alert("Next Step: Create Order API");
console.log(cart);
};

async function start(){
await initLiff();
await loadProducts();
}

start();