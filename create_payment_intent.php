
<?php
// Disable error output to prevent HTML in JSON response
error_reporting(0);
ini_set('display_errors', 0);

// Set JSON header first
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'vendor/autoload.php';

// Set your secret key here (using live key for production)
$stripe_secret_key = 'sk_test_51Rp5gMBjRGtHSh35wzk4oH2dKEk559SIY7k4sino0EWU72nM4gqZX3SpxQwcY7rsBSZTGOU3MILBAx7S0DjWfI2a00s99FW5Ip';

if (empty($stripe_secret_key) || $stripe_secret_key === 'YOUR_STRIPE_SECRET_KEY_HERE') {
    http_response_code(500);
    echo json_encode([
        'error' => 'Stripe API key not configured. Please set your Stripe secret key.',
        'type' => 'configuration_error'
    ]);
    exit;
}

\Stripe\Stripe::setApiKey($stripe_secret_key);

try {
    // Create a PaymentIntent with amount and currency
    $paymentIntent = \Stripe\PaymentIntent::create([
        'amount' => 499, // $4.99 in cents
        'currency' => 'usd',
        'automatic_payment_methods' => [
            'enabled' => true,
        ],
        'metadata' => [
            'source' => 'refund_letter_generator'
        ]
    ]);

    echo json_encode([
        'clientSecret' => $paymentIntent->client_secret,
        'status' => 'success'
    ]);
    
} catch (\Stripe\Exception\ApiErrorException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'type' => 'stripe_error'
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'type' => 'server_error'
    ]);
}
?>
