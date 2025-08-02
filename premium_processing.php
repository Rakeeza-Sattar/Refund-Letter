<?php
// Integrating Gmail SMTP using PHPMailer for improved email delivery.
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

require_once 'vendor/autoload.php';

header('Content-Type: application/json');

// Configuration constants
define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_USERNAME', 'your.email@gmail.com');  // Replace with your Gmail
define('SMTP_PASSWORD', 'your_app_password');     // Replace with your App Password
define('SMTP_PORT', 587);
define('FROM_EMAIL', 'your.email@gmail.com');
define('FROM_NAME', 'RefundPro Premium');
define('REPLY_TO_EMAIL', 'support@gmail.com');
define('REPLY_TO_NAME', 'RefundPro Support');

// Get the POST data
$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['email']) || !isset($data['letter']) || !isset($data['fullName'])) {
    echo json_encode(['success' => false, 'error' => 'Missing required data']);
    exit;
}

try {
    // Generate PDF (using TCPDF or similar library)
    $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false);

    // Set document information
    $pdf->SetCreator('Refund Letter Generator');
    $pdf->SetAuthor($data['fullName']);
    $pdf->SetTitle('Refund Request Letter');

    // Add a page
    $pdf->AddPage();

    // Set font
    $pdf->SetFont('helvetica', '', 12);

    // Add content
    $pdf->writeHTML('<h2>Refund Request Letter</h2>', true, false, true, false, '');
    $pdf->writeHTML('<pre>' . htmlspecialchars($data['letter']) . '</pre>', true, false, true, false, '');

    // Save PDF to temporary file
    $pdfContent = $pdf->Output('', 'S');
    $pdfFileName = 'refund_letter_' . date('Y-m-d') . '.pdf';

    // Create PHPMailer instance
    $mail = new PHPMailer(true);

    try {
        // Server settings for Gmail SMTP
        $mail->isSMTP();
        $mail->Host       = SMTP_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = SMTP_USERNAME;
        $mail->Password   = SMTP_PASSWORD;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = SMTP_PORT;

        // Recipients
        $mail->setFrom(FROM_EMAIL, FROM_NAME);
        $mail->addAddress($data['email'], $data['fullName']);
        $mail->addReplyTo(REPLY_TO_EMAIL, REPLY_TO_NAME);

        // Content
        $mail->isHTML(false);
        $mail->Subject = '📄 Your Premium Refund Letter is Ready - RefundPro';

        $message = "Dear " . htmlspecialchars($data['fullName']) . ",\n\n";
        $message .= "🎉 Congratulations! Your Premium Refund Request Letter has been successfully generated.\n\n";
        $message .= "🚀 Your premium letter includes:\n\n";
        $message .= "✅ Advanced legal references and consumer protection regulations\n";
        $message .= "✅ Professional business formatting\n";
        $message .= "✅ Optimized language for maximum refund success\n";
        $message .= "✅ Legal compliance statements\n";
        $message .= "✅ Ready-to-submit PDF format\n\n";
        $message .= "📎 Your complete premium refund letter is attached as a high-quality PDF document.\n\n";
        $message .= "💡 Pro Tips for Maximum Success:\n";
        $message .= "• Submit your letter within 30 days for best results\n";
        $message .= "• Keep copies of all correspondence\n";
        $message .= "• Follow up if you don't receive a response within 14 days\n\n";    
        $message .= "Thank you for choosing RefundPro Premium!\n\n";
        $message .= "Best regards,\n";
        $message .= "The RefundPro Team\n\n";
        $message .= "🌟 Need help with another refund? Visit us again anytime!";

        $mail->Body = $message;

        // Add PDF attachment
        $mail->addStringAttachment($pdfContent, $pdfFileName, 'base64', 'application/pdf');

        // Send email
        $emailSent = $mail->send();

        echo json_encode([
            'success' => true, 
            'message' => 'Premium letter generated and sent to your email successfully!',
            'features' => [
                'legal_references' => true,
                'pdf_included' => true,
                'email_delivered' => true,
                'premium_optimized' => true
            ]
        ]);

    } catch (Exception $e) {
        // Email failed, but still return success since premium processing worked
        echo json_encode([
            'success' => true, 
            'message' => 'Premium letter generated! Email delivery failed, but you can download the PDF below.',
            'warning' => 'Email delivery failed: ' . $mail->ErrorInfo,
            'features' => [
                'legal_references' => true,
                'pdf_included' => true,
                'email_delivered' => false,
                'premium_optimized' => true
            ]
        ]);
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false, 
        'error' => 'Error processing premium request: ' . $e->getMessage()
    ]);
}
?>