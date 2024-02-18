import React, { useEffect, useState } from "react";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { FaPaypal } from "react-icons/fa";
import useAxiosSecure from "../../hooks/useAxiosSecure";
import useAuth from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";

const CheckoutForm = ({ price, cart }) => {
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const axiosSecure = useAxiosSecure();

  const [cardError, setCardError] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  useEffect(() => {
    if (typeof price !== "number" || price < 1) {
      console.log("price is not a number");
      return;
    }
    axiosSecure.post("/create-payment-intent", { price }).then((res) => {
      console.log(res.data.clientSecret);
      setClientSecret(res.data.clientSecret);
    });
  }, [price, axiosSecure]);
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) {
      // Stripe.js has not loaded yet. Make sure to disable
      // form submission until Stripe.js has loaded.
      return;
    }
    const card = elements.getElement(CardElement);

    if (card == null) {
      return;
    }

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card,
    });

    if (error) {
      console.log("[error]", error);
      setCardError(error.message);
    } else {
      setCardError("success");
      console.log("[PaymentMethod]", paymentMethod);
    }

    const { paymentIntent, error: confirmError } =
      await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: card,
          billing_details: {
            name: user?.displayName || "anonymous",
            email: user?.email || "unknown",
          },
        },
      });
    if (confirmError) {
      console.log(confirmError);
    }
    console.log(paymentIntent);
    if (paymentIntent.status === "succeeded") {
      console.log(paymentIntent.id);
      setCardError(`Your transaction id is ${paymentIntent.id}`);
      const paymentInfo = {
        email: user.email,
        transitionId: paymentIntent.id,
        price,
        quantity: cart.length,
        status: "Order pending",
        itemName: cart.map((item) => item.name),
        cartItems: cart.map((item) => item._id),
        menuItems: cart.map((item) => item.menuItemId),
      };
      console.log(paymentInfo);
      // send info to backend
      axiosSecure.post("/payments", paymentInfo).then((res) => {
        console.log(res.data);
        navigate("/order");
        alert("payment successfull");
      });
    }
  };
  return (
    <div className="flex flex-col sm:flex-row justify-start gap-8">
      {/* left side */}
      <div className="md:w-1/2 w-full space-y-3">
        <h4 className="text-lg text-green font-semibold">order Summary</h4>
        <p className="text-black">Total Price: ${price}</p>
        <p className="text-black">Number of Items: {cart.length}</p>
      </div>

      {/* right side */}
      <div className="md:w-1/2 w-full space-y-3 card shrink-0 w-full max-w-sm shadow-2xl bg-base-100 px-4 py-8">
        <h4 className="text-lg text-white font-semibold">
          {" "}
          Process your payment
        </h4>
        <h5 className="font-medium">Credit/Debit Cart</h5>

        {/* stripe form */}
        <form onSubmit={handleSubmit}>
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#424770",
                  "::placeholder": {
                    color: "#aab7c4",
                  },
                },
                invalid: {
                  color: "#9e2146",
                },
              },
            }}
          />
          <button
            type="submit"
            disabled={!stripe}
            className="btn btn-sm mt-5 bg-green btn-primary w-full text-white"
          >
            Pay
          </button>
        </form>
        {cardError && <p className="text-red">{cardError}</p>}

        {/* paypal */}
        <div className="mt-5 text-center">
          <hr />
          <button type="submit" className="btn btn-sm bg-green mt-6 text-white">
            <FaPaypal /> Pay with PayPal
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutForm;
