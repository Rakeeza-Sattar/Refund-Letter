
<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'vendor/autoload.php';

// Set your secret key here
\Stripe\Stripe::setApiKey('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');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

try {
    // Log the request for debugging
    error_log('Payment intent creation requested');
    
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

    $output = [
        'clientSecret' => $paymentIntent->client_secret,
        'status' => 'success'
    ];

    error_log('Payment intent created successfully: ' . $paymentIntent->id);
    echo json_encode($output);
    
} catch (\Stripe\Exception\ApiErrorException $e) {
    error_log('Stripe API Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Stripe API Error: ' . $e->getMessage(),
        'type' => 'stripe_error'
    ]);
} catch (Exception $e) {
    error_log('Server Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Server Error: ' . $e->getMessage(),
        'type' => 'server_error'
    ]);
} catch (Error $e) {
    error_log('Fatal Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Fatal Error: ' . $e->getMessage(),
        'type' => 'fatal_error'
    ]);
}
?>
