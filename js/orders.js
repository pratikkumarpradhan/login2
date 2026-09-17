/* =========================================================
   PROJECTKART
   Orders
   ========================================================= */

   import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    doc,
    updateDoc,
    serverTimestamp
} from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    db
} from "./firebase.js";


const ORDERS =
    "orders";


/*
|--------------------------------------------------------------------------
| Create Order
|--------------------------------------------------------------------------
*/

export async function createOrder({
    userId,
    items,
    customer,
    paymentMethod = "pending"
}) {

    if (!userId) {
        throw new Error(
            "You must be logged in to place an order."
        );
    }


    if (
        !Array.isArray(items)
        ||
        items.length === 0
    ) {

        throw new Error(
            "Your cart is empty."
        );
    }


    const subtotal =
        items.reduce(
            (
                total,
                item
            ) => {

                return total +
                    (
                        Number(
                            item.price || 0
                        )
                        *
                        Number(
                            item.quantity || 0
                        )
                    );

            },
            0
        );


    const order = {

        userId:
            userId,

        items:
            items.map(
                item => ({

                    productId:
                        item.id,

                    name:
                        item.name,

                    price:
                        Number(
                            item.price || 0
                        ),

                    quantity:
                        Number(
                            item.quantity || 0
                        ),

                    image:
                        item.image || ""
                })
            ),

        customer: {

            name:
                customer?.name || "",

            email:
                customer?.email || "",

            phone:
                customer?.phone || "",

            address:
                customer?.address || ""
        },

        subtotal:
            subtotal,

        total:
            subtotal,

        paymentMethod:
            paymentMethod,

        paymentStatus:
            "pending",

        orderStatus:
            "pending",

        createdAt:
            serverTimestamp(),

        updatedAt:
            serverTimestamp()
    };


    const reference =
        await addDoc(
            collection(
                db,
                ORDERS
            ),
            order
        );


    return reference.id;
}


/*
|--------------------------------------------------------------------------
| Get Current User Orders
|--------------------------------------------------------------------------
*/

export async function getUserOrders(
    userId
) {

    if (!userId) {
        return [];
    }


    const orderQuery =
        query(

            collection(
                db,
                ORDERS
            ),

            where(
                "userId",
                "==",
                userId
            ),

            orderBy(
                "createdAt",
                "desc"
            )
        );


    const snapshot =
        await getDocs(
            orderQuery
        );


    return snapshot.docs.map(
        document => ({

            id:
                document.id,

            ...document.data()
        })
    );
}


/*
|--------------------------------------------------------------------------
| ADMIN — Get All Orders
|--------------------------------------------------------------------------
*/

export async function getAllOrders() {

    const orderQuery =
        query(

            collection(
                db,
                ORDERS
            ),

            orderBy(
                "createdAt",
                "desc"
            )
        );


    const snapshot =
        await getDocs(
            orderQuery
        );


    return snapshot.docs.map(
        document => ({

            id:
                document.id,

            ...document.data()
        })
    );
}


/*
|--------------------------------------------------------------------------
| ADMIN — Update Order Status
|--------------------------------------------------------------------------
*/

export async function updateOrderStatus(
    orderId,
    orderStatus
) {

    if (!orderId) {
        throw new Error(
            "Order ID is required."
        );
    }


    await updateDoc(

        doc(
            db,
            ORDERS,
            orderId
        ),

        {

            orderStatus:
                orderStatus,

            updatedAt:
                serverTimestamp()
        }
    );


    return true;
}