var tableNo = null

AFRAME.registerComponent("markerhandler", {
  init: async function () {
    if (tableNo === null){
      this.asktableNo()
    }

    //get the dishes collection from firestore database
    var dishes = await this.getDishes();



    //markerFound event
    this.el.addEventListener("markerFound", () => {
      if (tableNo !== null){
        var markerId = this.el.id;      
        this.handleMarkerFound(dishes, markerId);
      }
    });

    //markerLost event
    this.el.addEventListener("markerLost", () => {
      this.handleMarkerLost();
    });

  },

  asktableNo: function (){
    var iconurl = 'https://raw.githubusercontent.com/whitehatjr/menu-card-app/main/hunger.png'
    swal({
      title: 'Welcome to Hunger',
      icon: iconurl,
      content: {
        element: 'input',
        attributes: {
          placeholder: 'Type your Table No.',
          type: 'number',
          min: 1 
        }
      },
      closeOnClickOutside: false,
    }).then((inputvalue) => {
      tableNo = inputvalue 
    })
  },

  handleMarkerFound: function (dishes, markerId) {
    var todaysDate = new Date()
    var todaysDay = todaysDate.getDay()
    // Sunday to Saturday = 0-6 
    days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

    // Changing Model scale to initial scale
    var dish = dishes.filter(dish => dish.id === markerId)[0];

    if (dish.unavailable_days.includes(days[todaysDay])){
      swal({
        icon: 'warning',
        title: dish.dish_name.toUpperCase(),
        text: 'This Dish is not available Currently',
        timer: 2500,
        buttons: false
      })
    }

    else{
    var model = document.querySelector(`#model-${dish.id}`);
    model.setAttribute("position", dish.model_geometry.position);
    model.setAttribute("rotation", dish.model_geometry.rotation);
    model.setAttribute("scale", dish.model_geometry.scale);
    model.setAttribute('visible', true)

    var ingredientsList = document.querySelector('#main-plane-${dish.id}')
    ingredientsList.setAttribute('visible', true)

    var pricePlane = document.querySelector('#price-plane-${dish.id}')
    pricePlane.setAttribute('visible', true)

    // Changing button div visibility
    var buttonDiv = document.getElementById("button-div");
    buttonDiv.style.display = "flex";

    var ratingButton = document.getElementById("rating-button");
    var orderButtton = document.getElementById("order-button");
    var orderSummary = document.getElementById('order-summary')
    var payButton = document.getElementById('pay-button')

    // Handling Click Events
    ratingButton.addEventListener("click", () => {
      this.handleRating(dish)
    });

    orderButtton.addEventListener("click", () => {
      var tableNo = 
      tableNo <= 9?(tableNo = `t0${tableNo}`):`t${tableNo}`

      this.handleOrders(tableNo, dish)
      swal({
        icon: "https://i.imgur.com/4NZ6uLY.jpg",
        title: "Thanks For Order !",
        text: "Your order will serve soon on your table!"
      });
    });

    orderSummary.addEventListener("click", () => {
      this.handleOrderSummary()
    })

    payButton.addEventListener('click', () => {
      this.handlePayment()
    })
  }
    
  },

  handleMarkerLost: function () {
    // Changing button div visibility
    var buttonDiv = document.getElementById("button-div");
    buttonDiv.style.display = "none";
  },

  handleOrders: function(tableNo, dish){
    firebase.firestore().collection('tables').doc(tableNo).get().then((document) => {
      var details = document.data()
      if (details['current_orders'][dish.id]){
        details['current_orders'][dish.id]['quantity'] += 1

        var currentQuantity = details['current_orders'][dish.id]['quantity']
        details['current_orders'][dish.id]['subtotal'] = currentQuantity * dish.Price
      }
      else{
        details['current_orders'][dish.id] = {
          item: dish.dish_name,
          price: dish.Price,
          quantity: 1,
          subtotal: dish.Price * 1
        }
      }

      details.toatalBill += dish.Price

      // Updating data to database
      firebase.firestore().collection('tables').doc(document.id).update(details)
    })
  },

  handleOrderSummary: async function(){
    var tableNo 
    tableNo <= 9 ? (tableNo = `t0${tableNo}`) : (tableNo = `t${tableNo}`)
    
    var orderDetails = await this.getOrderSummary(tableNo) 
    var modelDiv = document.getElementById('modal-div')
    modelDiv.style.display = flex

    var tableTag = document.getElementById('bill-table-body')
    tableTag.innerHTML = ''

    var currentOrders = Object.keys(orderSummary.currentOrders)
    currentOrders.map(fooditem => {
      // creating a table row
      var tr  = document.createElement('tr')
      // create table cells
      var item = document.createElement('td')
      var price = document.createElement('td')
      var quantity = document.createElement('td')
      var subtotal = document.createElement('td')

      // adding HTML content
      item.innerHTML = orderSummary.currentOrders[fooditem].item
      price.innerHTML = 'Rs.' + orderSummary.currentOrders[fooditem].price
      price.setAttribute('class', 'text-center')
      quantity.innerHTML = orderSummary.currentOrders[fooditem].quantity
      quantity.setAttribute('class', 'text-center')
      subtotal.innerHTML = 'Rs.' + orderSummary.currentOrders[fooditem].subtotal
      subtotal.setAttribute('class', 'text-center')
      // appending cells to the row
      tr.appendChild(item)
      tr.appendChild(price)
      tr.appendChild(quantity)
      tr.appendChild(subtotal) 

      tableTag.appendChild(tr)

      // /create table row for total bill
      var totaltr = document.createElement('tr')
      var td1 = document.createElement('td')
      td1.setAttribute('class', 'no-line')
      var td2 = document.createElement('td')
      td2.setAttribute('class', 'no-line')
      var td3 = document.createElement('td')
      td3.setAttribute('class', 'no-line text-center')
      var strongTag = document.createElement('strong')
      strongTag.innerHTML = 'Total'
      td3.appendChild(strongTag)

      var td4 = document.createElement('td')
      td4.setAttribute('class', 'no-line text-center')
      td4.innerHTML = 'Rs.' + orderSummary.totalBill
      totaltr.appendChild(td1)
      totaltr.appendChild(td2)
      totaltr.appendChild(td3)
      totaltr.appendChild(td4)

      tableTag.appendChild(totaltr) 
    })

  },

  handlePayment: function() {
    document.getElementById('modal-div').style.display = 'none'
    var tableNo  
    tableNo <= 9?(tableNo = `t0${tableNo}`): `t${tableNo}`
    firebase.firestore().collection('tables').doc(tableNo).update({
      current_orders: {},
      total_bill: 0
    }).then(() => {
      swal({
        icon: 'success',
        title: 'Payment is Done Successfully',
        text: 'We hope you enjoyed your food',
        timer: 4000,
        buttons: false 
      })
    })
  },

  handleRating: async function(dish) {
    var tableNo
    tableNo <= 9? (tableNo = `t0${tableNo}`): `t${tableNo}`
    var orderSummary = await this.getOrderSummary(tableNo)
    var currentOrders = Object.keys(orderSummary.current_orders)
    if (currentOrders.length > 0 && currentOrders === dish.id){
      document.getElementById('rating-modal-div').style.display = 'flex'
      document.getElementById('rating-input').value = 0
      document.getElementById('feedback-input').value = ''
      var saveRatingButton = document.getElementById('save-rating-button')
      saveRatingButton.addEventListener('click', () => {
        document.getElementById('rating-modal-div').style.display = 'none'
        var rating = document.getElementById('rating-input').value 
        var feedback = document.getElementById('feedback-input').value
        firebase.firestore().collection('dishes').doc(dish.id).update({
          last_review: feedback,
          last_rating: rating
        }).then(() => {
          swal({
            icon: 'success',
            title: 'Thanks for Rating',
            text: 'We hope you liked our service',
            timer: 4000,
            buttons: false
          })
        })
      })
    }

    else{
      swal({
        icon: 'warning',
        title: 'Oops, Something went wrong',
        text: 'No dish is found to give rating',
        timer: 4000,
        buttons: false
      })
    }
  },

  //get the dishes collection from firestore database
  getDishes: async function () {
    return await firebase
      .firestore()
      .collection("dishes")
      .get()
      .then(snap => {
        return snap.docs.map(doc => doc.data());
      });
  },

});
