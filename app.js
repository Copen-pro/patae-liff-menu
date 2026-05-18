const PRODUCTS_API = "https://copen.app.n8n.cloud/webhook/patae/products";
const CREATE_ORDER_API = "https://copen.app.n8n.cloud/webhook/patae/create-order";
const STORE_STATUS_API =  "https://copen.app.n8n.cloud/webhook/patae/store/status";
const LIFF_ID = "2010088421-1DJFs0Xx";

let allProducts = [];
let currentCategory = null;
let cart = {};
let isSubmitting = false;
let lineProfile = null;

function optimizeImage(url){
  if(!url) return "";
  if(!url.includes("/upload/")) return url;

  return url.replace(
    "/upload/",
    "/upload/f_auto,q_auto,w_360/"
  );
}

async function initLiff(){
  try{
    if(LIFF_ID !== "PUT_YOUR_LIFF_ID_HERE"){
      await liff.init({ liffId: LIFF_ID });

      if(!liff.isInClient() && !liff.isLoggedIn()){
        liff.login({ redirectUri: window.location.href });
        return;
      }

      if(liff.isLoggedIn()){
        lineProfile = await liff.getProfile();
        console.log("LINE Profile:", lineProfile);
      }
    }
  }catch(err){
    console.error("LIFF error:", err);
  }
}

async function checkStoreStatus(){
  try{
    const res = await fetch(STORE_STATUS_API);
    const data = await res.json();

    if(!data.is_open){
      document.body.innerHTML = `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f6f2ed;padding:20px;font-family:Arial,sans-serif;text-align:center;">
          <div style="background:white;padding:28px;border-radius:22px;box-shadow:0 4px 14px rgba(0,0,0,.08);max-width:360px;">
            <h2>☕ PaTae Cafe</h2>
            <h3>ร้านปิดรับออเดอร์ครับ</h3>
            <p>${data.message || "กรุณากลับมาสั่งใหม่ในเวลาทำการครับ"}</p>
          </div>
        </div>
      `;
      return false;
    }

    return true;
  }catch(err){
    console.error(err);
    return true;
  }
}

async function loadProducts(){
  const productsBox = document.getElementById("products");

  productsBox.innerHTML =
    "<div class='loading'>กำลังโหลดเมนู...</div>";

  try{
    const res = await fetch(PRODUCTS_API);
    const data = await res.json();

    if(data.is_open === false){
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f6f2ed;padding:20px;font-family:Arial,sans-serif;text-align:center;">
      <div style="background:white;padding:28px;border-radius:22px;box-shadow:0 4px 14px rgba(0,0,0,.08);max-width:360px;">
        <h2>☕ PaTae Cafe</h2>
        <h3>ร้านปิดรับออเดอร์ค่ะ</h3>
        <p>${data.message || "กรุณากลับมาสั่งใหม่ในเวลาทำการค่ะ"}</p>
      </div>
    </div>
  `;
  return;
}
    
allProducts = data.products || [];

currentCategory = null;
buildTabs();
renderProducts();

  }catch(err){
    console.error("Load products error:", err);
    productsBox.innerHTML =
      "<div class='loading'>โหลดเมนูไม่สำเร็จ กรุณาลองใหม่ค่ะ</div>";
  }
}

function buildTabs(){
  const tabs = document.getElementById("category-tabs");
  tabs.innerHTML = "";

  const categories = [...new Set(allProducts.map(p => p.category))];

  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.innerText = cat;

    if(!currentCategory){
      currentCategory = cat;
      btn.classList.add("active");
    }

    btn.onclick = () => {
      currentCategory = cat;

      document.querySelectorAll(".tabs button")
        .forEach(b => b.classList.remove("active"));

      btn.classList.add("active");
      renderProducts();
    };

    tabs.appendChild(btn);
  });
}

function renderProducts(){
  const container = document.getElementById("products");
  container.innerHTML = "";

  const products = allProducts.filter(
    p => p.category === currentCategory
  );

  products.forEach(product => {
    const qty = cart[product.product_id]?.qty || 0;

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img 
        loading="lazy"
        src="${optimizeImage(product.image_url)}"
      >
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
  const product = allProducts.find(
    p => p.product_id === productId
  );

  if(!product) return;

  if(!cart[productId]){
    cart[productId] = {
      ...product,
      qty: 0
    };
  }

  cart[productId].qty++;

  updateCart();
  renderProducts();
}

function decreaseQty(productId){
  if(!cart[productId]) return;

  cart[productId].qty--;

  if(cart[productId].qty <= 0){
    delete cart[productId];
  }

  updateCart();
  renderProducts();
}

function updateCart(){
  const items = Object.values(cart);

  const totalQty = items.reduce(
    (sum, i) => sum + i.qty,
    0
  );

  const totalAmount = items.reduce(
    (sum, i) => sum + (i.qty * i.price),
    0
  );

  document.getElementById("cart-count").innerText = totalQty;
  document.getElementById("cart-total").innerText = totalAmount;
  document.getElementById("modal-total").innerText = totalAmount;

  const checkoutTotal = document.getElementById("checkout-total");
  if(checkoutTotal){
    checkoutTotal.innerText = totalAmount;
  }

  renderCartItems();
}

function renderCartItems(){
  const container = document.getElementById("cart-items");
  const items = Object.values(cart);

  container.innerHTML = "";

  if(items.length === 0){
    container.innerHTML = `
      <p style="text-align:center;color:#777;padding:20px;">
        Your cart is empty ☕
      </p>
    `;
    return;
  }

  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "cart-item";

    div.innerHTML = `
      <div>
        <div class="cart-item-name">${item.product_name}</div>
        <div class="cart-item-detail">
          ${item.qty} x ${item.price} บาท
        </div>
      </div>

      <div class="cart-item-total">
        ${item.qty * item.price} บาท
      </div>
    `;

    container.appendChild(div);
  });
}

function openCart(){
  updateCart();

  document.getElementById("cart-view").classList.remove("hidden");
  document.getElementById("checkout-view").classList.add("hidden");
  document.getElementById("cart-modal").classList.remove("hidden");
}

function closeCart(){

  if(isSubmitting){
    alert("กำลังส่งออเดอร์ กรุณารอสักครู่ค่ะ");
    return;
  }

  document.getElementById("cart-modal").classList.add("hidden");
}

function goCheckout(){
  const items = Object.values(cart);

  if(items.length === 0){
    alert("กรุณาเลือกสินค้าก่อนค่ะ ☕");
    return;
  }

  updateCart();

  document.getElementById("cart-view").classList.add("hidden");
  document.getElementById("checkout-view").classList.remove("hidden");
}

function backToCart(){

  if(isSubmitting){
    alert("กำลังส่งออเดอร์ กรุณารอสักครู่ค่ะ");
    return;
  }

  document.getElementById("checkout-view").classList.add("hidden");
  document.getElementById("cart-view").classList.remove("hidden");
}

function resetConfirmButton(){

  isSubmitting = false;

  const confirmBtn =
    document.getElementById("confirm-order-btn");

  confirmBtn.disabled = false;
  confirmBtn.innerText = "Confirm Order";

  document.getElementById("back-to-cart-btn").disabled = false;
  document.getElementById("close-cart-btn").disabled = false;
}

async function confirmOrder(){

  if(isSubmitting){
    return;
  }

  isSubmitting = true;

  const confirmBtn =
    document.getElementById("confirm-order-btn");

  confirmBtn.disabled = true;
  confirmBtn.innerText = "กำลังส่งออเดอร์...";
  document.getElementById("back-to-cart-btn").disabled = true;
  document.getElementById("close-cart-btn").disabled = true;

  const items = Object.values(cart);

if(items.length === 0){

  isSubmitting = false;

  confirmBtn.disabled = false;
  confirmBtn.innerText = "Confirm Order";

  alert("กรุณาเลือกสินค้าก่อนค่ะ ☕");
  return;
}

  const customerName = document.getElementById("customer-name").value.trim();
  const customerPhone = document.getElementById("customer-phone").value.trim();
  const fulfillmentType = document.getElementById("fulfillment-type").value;
  const customerNote = document.getElementById("customer-note").value.trim();
if(
  fulfillmentType === "delivery" &&
  !document.getElementById("delivery-address").value.trim()
){
  resetConfirmButton();
  alert("กรุณาระบุที่อยู่จัดส่งค่ะ");
  return;
}

if(!customerName){
  resetConfirmButton();
  alert("กรุณาใส่ชื่อลูกค้าค่ะ");
  return;
}

if(!customerPhone){
  resetConfirmButton();
  alert("กรุณาใส่เบอร์โทรค่ะ");
  return;
}

const isOpen = await checkStoreStatus();

if(!isOpen){
  resetConfirmButton();
  return;
}
  
  
const payload = {
  order_channel: "LINE",

  order_type:
    items.every(i => i.order_type === "CUSTOM")
      ? "CUSTOM"
      : "NORMAL",

  has_custom:
    items.some(i => i.order_type === "CUSTOM"),

  custom_request:
    items
      .filter(i => i.order_type === "CUSTOM")
      .map(i => i.custom_request)
      .join("\n"), 
 
  line_user_id: lineProfile?.userId || "",
  line_display_name: lineProfile?.displayName || "",
  
  customer_name: customerName,
  customer_phone: customerPhone,
  fulfillment_type: fulfillmentType,
  customer_note: customerNote,
  delivery_address:
  document.getElementById("delivery-address").value.trim(),

  items: items.map(item => ({
    product_id: item.product_id,
    product_name: item.product_name,
    price: item.price,
    qty: item.qty
  }))
};

  try{
    const res = await fetch(CREATE_ORDER_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if(data.success){
      document.getElementById("success-order-no").innerText = data.order_no;
      document.getElementById("success-queue-no").innerText = data.queue_no || "-";
      
      resetConfirmButton();
      
      document.getElementById("cart-modal").classList.add("hidden");
      document.getElementById("success-modal").classList.remove("hidden");

      cart = {};
      updateCart();
      renderProducts();

      document.getElementById("custom-request").value = "";
      
      }else{
      resetConfirmButton();
      alert(data.message || "ส่งออเดอร์ไม่สำเร็จ กรุณาลองใหม่ค่ะ");
      }

}catch(err){

  resetConfirmButton();

  console.error(err);

  alert("ระบบขัดข้อง กรุณาลองใหม่ค่ะ");
}
}

function openCustom(){
  document
    .getElementById("custom-modal")
    .classList.remove("hidden");
}

function closeCustom(){

  document
    .getElementById("custom-modal")
    .classList.add("hidden");

  document
    .getElementById("custom-request")
    .value = "";

}

function addCustomOrder(){
  const request =
    document.getElementById("custom-request")
      .value
      .trim();

  if(!request){
    alert("กรุณาระบุรายการที่ต้องการค่ะ");
    return;
  }

  cart["CUSTOM"] = {
    product_id: "CUSTOM",
    product_name: "📝 สั่งพิเศษ",
    price: 0,
    qty: 1,
    order_type: "CUSTOM",
    custom_request: request
  };

  updateCart();
  closeCustom();

  alert("เพิ่มรายการสั่งพิเศษแล้วค่ะ");
}

function bindEvents(){
  document.getElementById("view-cart-btn").onclick = openCart;
  document.getElementById("close-cart-btn").onclick = closeCart;
  document.getElementById("go-checkout-btn").onclick = goCheckout;
  document.getElementById("back-to-cart-btn").onclick = backToCart;
  document.getElementById("confirm-order-btn").onclick = confirmOrder;
  document.getElementById("custom-order-btn").onclick = openCustom;
}

async function start(){
  bindEvents();
  await initLiff();

  await loadProducts();
}

document.getElementById("success-close-btn").onclick = () => {
 document.getElementById("success-modal").classList.add("hidden");
  cart = {};
  updateCart();
  renderProducts();
  document.getElementById("customer-name").value = "";
  document.getElementById("customer-phone").value = "";
  document.getElementById("customer-note").value = "";
  document.getElementById("fulfillment-type").value = "pickup";
  document.getElementById("delivery-address").value = "";
  document.getElementById("delivery-fields").classList.add("hidden");

  resetConfirmButton();
  
};

document.getElementById("fulfillment-type")
.addEventListener("change", (e)=>{

  const deliveryBox =
    document.getElementById("delivery-fields");

  const deliveryAddress =
    document.getElementById("delivery-address");

  if(e.target.value === "delivery"){
    deliveryBox.classList.remove("hidden");
  }else{
    deliveryBox.classList.add("hidden");
    deliveryAddress.value = "";
  }

});

start();
