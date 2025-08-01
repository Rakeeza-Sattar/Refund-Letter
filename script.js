document.addEventListener('DOMContentLoaded', function () {
    const refundForm = document.getElementById('refundForm');
    const generateFreeBtn = document.getElementById('generateFree');
    const generatePremiumBtn = document.getElementById('generatePremium');
    const letterContainer = document.getElementById('letterContainer');
    const generatedLetter = document.getElementById('generatedLetter');
    const copyLetterBtn = document.getElementById('copyLetter');
    const paymentModal = document.getElementById('paymentModal');
    const closeModal = document.querySelector('.close');
    let submitPaymentBtn = document.getElementById('submitPayment');

    // Initialize Stripe
    const stripe = Stripe('pk_live_51Rp5gFBpnow2VOeaQvZlUau13AhA7L48stK8qf7puDCRHeff0HraLiD9HXtafgE3TNknE9AX0kFnJ5a9900C2EEC003btzB7FZ');
    let elements;

    // Generate free letter
    generateFreeBtn.addEventListener('click', function () {
        if (!refundForm.checkValidity()) {
            refundForm.reportValidity();
            return;
        }

        const formData = new FormData(refundForm);
        const data = Object.fromEntries(formData.entries());

        generateLetter(data, false);
    });

    // Generate premium letter - show payment modal
    generatePremiumBtn.addEventListener('click', function () {
        if (!refundForm.checkValidity()) {
            refundForm.reportValidity();
            return;
        }

        paymentModal.classList.remove('hidden');
        initializePayment();
    });

    // Close modal
    closeModal.addEventListener('click', function () {
        paymentModal.classList.add('hidden');
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === paymentModal) {
            paymentModal.classList.add('hidden');
        }
    });

    // Copy letter to clipboard
    copyLetterBtn.addEventListener('click', function () {
        navigator.clipboard.writeText(generatedLetter.textContent)
            .then(() => {
                copyLetterBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyLetterBtn.textContent = 'Copy Letter';
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy: ', err);
            });
    });

    // Generate letter using AI
    function generateLetter(data, isPremium) {
        // Show loading state
        if (isPremium) {
            submitPaymentBtn.disabled = true;
            submitPaymentBtn.textContent = 'Generating Letter...';
        } else {
            generateFreeBtn.disabled = true;
            generateFreeBtn.textContent = 'Generating...';
        }

        // Prepare the data to send to the server
        const requestData = {
            ...data,
            isPremium: isPremium
        };

        // Send data to PHP backend
        fetch('generate_letter.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    generatedLetter.textContent = data.letter;
                    letterContainer.classList.remove('hidden');

                    if (isPremium) {
                        // Process premium features (email + PDF)
                        fetch('premium_processing.php', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                email: requestData.email,
                                fullName: requestData.fullName,
                                letter: data.letter
                            })
                        })
                        .then(response => response.json())
                        .then(premiumData => {
                            paymentModal.classList.add('hidden');
                            if (premiumData.success) {
                                alert('Premium letter generated and sent to your email with PDF attachment!');
                            } else {
                                alert('Letter generated but failed to send email: ' + premiumData.error);
                            }
                        })
                        .catch(error => {
                            console.error('Premium processing error:', error);
                            paymentModal.classList.add('hidden');
                            alert('Letter generated but premium processing failed. Please contact support.');
                        });
                    }
                } else {
                    alert('Error generating letter: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while generating the letter.');
            })
            .finally(() => {
                if (isPremium) {
                    submitPaymentBtn.disabled = false;
                    submitPaymentBtn.textContent = 'Pay $4.99';
                } else {
                    generateFreeBtn.disabled = false;
                    generateFreeBtn.textContent = 'Generate Free Letter';
                }
            });
    }

    // Initialize Stripe payment
    async function initializePayment() {
        try {
            // Clear any existing payment element first
            const paymentElementContainer = document.getElementById('paymentElement');
            if (paymentElementContainer) {
                paymentElementContainer.innerHTML = '';
            }

            // Create payment intent
            const response = await fetch('create_payment_intent.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            if (!data.clientSecret) {
                throw new Error('No client secret received from server');
            }

            // Create payment elements with client secret
            elements = stripe.elements({ 
                clientSecret: data.clientSecret,
                appearance: {
                    theme: 'stripe'
                }
            });
            
            const paymentElement = elements.create('payment', {
                layout: 'tabs'
            });
            
            // Wait a bit before mounting to ensure DOM is ready
            setTimeout(() => {
                paymentElement.mount('#paymentElement');
            }, 100);

            // Handle form submission - remove any existing listeners first
            const newSubmitBtn = submitPaymentBtn.cloneNode(true);
            submitPaymentBtn.parentNode.replaceChild(newSubmitBtn, submitPaymentBtn);
            submitPaymentBtn = newSubmitBtn; // Update global reference
            
            newSubmitBtn.addEventListener('click', async (e) => {
                e.preventDefault();

                newSubmitBtn.disabled = true;
                newSubmitBtn.textContent = 'Processing...';

                try {
                    const { error } = await stripe.confirmPayment({
                        elements,
                        confirmParams: {
                            return_url: window.location.href.split('?')[0],
                        },
                        redirect: 'if_required'
                    });

                    if (error) {
                        throw new Error(error.message);
                    } else {
                        // Payment succeeded - generate premium letter
                        const formData = new FormData(refundForm);
                        const letterData = Object.fromEntries(formData.entries());
                        generateLetter(letterData, true);
                    }
                } catch (paymentError) {
                    console.error('Payment error:', paymentError);
                    alert('Payment failed: ' + paymentError.message);
                    newSubmitBtn.disabled = false;
                    newSubmitBtn.textContent = 'Pay $4.99';
                }
            });
        } catch (error) {
            console.error('Error initializing payment:', error);
            alert('Error setting up payment: ' + error.message + '. Please try again.');
        }
    }
});