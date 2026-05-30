async function loadCustomers() {

    const response = await fetch ("/customers");
    const customers = await response.json();

    const customerList = document.getElementById("customerList");
    customerList.innerHTML = "";

    customers.forEach(customer => {

        customerList.innerHTML += `
            <div class="customer-card">
            <h3>${customer.name}</h3>
            <p>${customer.phone}</p>
            </div>
        `;
    });

}


async function loadCustomersDropdown() {

    const response = await fetch("/customers");
    const customers = await response.json();

    const select = document.getElementById("customerSelect");
    select.innerHTML = ` <option value="">Select Customer</option> `;
    
    customers.forEach(customer => {
        select.innerHTML += `
        <option value="${customer.id}"> ${customer.name} </option> `;
    });
}


async function addMilk() {

    const customer_id = document.getElementById("customerSelect").value;
    const quantity = document.getElementById("quantity").value;
    const date = document.getElementById("date").value;
    const rate = document.getElementById("rate").value;

    if (quantity <= 0 || rate.length === 0) {
        alert("Invalid Input");
        return;
    }

    // send POST request 

    await fetch ("/add-milk", {

        method: "POST",
        
        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify( {
            customer_id,
            date,
            quantity,
            rate
        })
    });

    alert("Milk added Successfully");
}


async function addPayment() {
 
    const date = document.getElementById("date").value;
    const customer_id = document.getElementById("customerSelect").value;
    const amount = document.getElementById("amount").value;

    if (amount <= 0) {
        alert("Invalid amount");
        return;
    }

    await fetch ("/add-payment", {

        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            customer_id,
            date,
            amount
        })
    });

    alert("Payment succesfully added");

    document.getElementById("amount").value = "";
    document.getElementById("date").value = "";
}



async function addCustomer() {
    
    const name = document.getElementById("add_customer").value;
    const phone = document.getElementById("add_number").value;

    if(!name || !phone) {
        alert("Invalid Input");
        return;
    }


    await fetch ("/add-customers", {

        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name,
            phone
        })
    });

    alert("Customer added Successfully");

    document.getElementById("add_customer").value = "";
    document.getElementById("add_number").value = "";

    loadCustomersDropdown();

}


async function deleteCustomer() {

    const id = document.getElementById("customerSelect").value;

    if (!id) {
        alert("Select a customer");
        return;
    }

    await fetch(`/delete/${id}`, {

        method: "DELETE",

    });

    

    alert("Customer deleted successfully");

    document.getElementById("customerSelect").value = "";

    loadCustomersDropdown();

}


async function fetchPayments() {

    const customer_id = document.getElementById("customerSelect").value;
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;

    if (!customer_id) {
        alert("Please select the customer");
        return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);

    if (startDate > endDate /*||new Date(endDate) > yesterday*/) {
        alert("Invalid Start date");
        return;
    }


    const response = await fetch(`/payment_bill?customer_id=${customer_id}&startDate=${startDate}&endDate=${endDate}`);
    const payment_bill = await response.json();

    console.log(payment_bill);

    renderPayments(payment_bill);

    alert("Fetched payments successfully");
}



function renderPayments(payment_bill) {

    const paymentContainer = document.getElementById("paymentContainer");

    let tableRows = "";

    // Loop through milk entries

    payment_bill.payments.forEach(entry => {

        tableRows += `

            <tr>

                <td>${formatDate(entry.date)}</td>

                <td>${entry.amount}</td>

            </tr>

        `;
    });

    paymentContainer.innerHTML = `

        <div class="bill-card">

            <h2>Payment Entries</h2>

            <table>

                <tr>

                    <th>Date</th>

                    <th>Amount</th>

                </tr>

                ${tableRows}

            </table>

            <hr>

            <h2>Payment Summary</h2>

            <p>
                Milk Total:
                ₹${payment_bill.milk_total}

            <p>
                Payment Total:
                ₹${payment_bill.payment_total}
            </p>

            <p>
                Balance:
                ₹${payment_bill.balance}
            </p>

        </div>

    `;
}


async function fetchBill() {

    const customer_id = document.getElementById("customerSelect").value;
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);


    if (startDate > endDate || endDate > yesterday) {
        alert("Invalid date");
        return;
    }

    const response = await fetch(`/bill?customer_id=${customer_id}&startDate=${startDate}&endDate=${endDate}`);

    const bill = await response.json();

    renderBill(bill);

    alert("Succesfully fetched bill");
}


function renderBill(bill) {

    const billContainer =
    document.getElementById("billContainer");

    let tableRows = "";

    // Loop through milk entries

    bill.milk_entries.forEach(entry => {

        tableRows += `

            <tr>

                <td>${formatDate(entry.date)}</td>

                <td>${entry.quantity}</td>

                <td>${entry.rate}</td>

                <td>${entry.total}</td>

            </tr>

        `;
    });

    billContainer.innerHTML = `

        <div class="bill-card">

            <h2>Milk Entries</h2>

            <table>

                <tr>

                    <th>Date</th>

                    <th>Quantity (L)</th>

                    <th>Rate</th>

                    <th>Total</th>

                </tr>

                ${tableRows}

            </table>


            <h2>Bill Summary</h2>

            <p>
                Milk Quantity:
                ${bill.milk_quantity}
            </p>

            <p>
                Milk Total:
                ₹${bill.milk_total}
            </p>

            <p>
                Payment Total:
                ₹${bill.payment_total}
            </p>

            <h3>
                Balance:
                ₹${bill.balance}
            </h3>

        </div>

    `;
}


function formatDate(dateString) {
    const date = new Date(dateString);

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}






