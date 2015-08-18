<?php
class Bc_OneCheckout_IndexController extends Mage_Checkout_Controller_Action
{
    /**
     * Get one page checkout model
     *
     * @return Mage_Checkout_Model_Type_Onepage
     */
    public function getOnepage(){
        return Mage::getSingleton('checkout/type_onepage');
    }

    protected function _getCart(){
        return Mage::getSingleton('checkout/cart');
    }

    /**
     * Get Order by quoteId
     *
     * @return Mage_Sales_Model_Order
     */
    protected function _getOrder(){
        if (is_null($this->_order)) {
            $this->_order = Mage::getModel('sales/order')->load($this->getOnepage()->getQuote()->getId(), 'quote_id');
            if (!$this->_order->getId()) {
                throw new Mage_Payment_Model_Info_Exception(Mage::helper('core')->__("Can not create invoice. Order was not found."));
            }
        }
        return $this->_order;
    }

    /**
     * Create invoice
     *
     * @return Mage_Sales_Model_Order_Invoice
     */
    protected function _initInvoice()
    {
        $items = array();
        foreach ($this->_getOrder()->getAllItems() as $item) {
            $items[$item->getId()] = $item->getQtyOrdered();
        }
        /* @var $invoice Mage_Sales_Model_Service_Order */
        $invoice = Mage::getModel('sales/service_order', $this->_getOrder())->prepareInvoice($items);
        $invoice->setEmailSent(true)->register();

        Mage::register('current_invoice', $invoice);
        return $invoice;
    }
    protected function _getSession(){
        return Mage::getSingleton('checkout/session');
    }

    protected function _getQuote(){
        return $this->_getCart()->getQuote();
    }
    protected function _ajaxRedirectResponse(){
        $this->getResponse()
            ->setHeader('HTTP/1.1', '403 Session Expired')
            ->setHeader('Login-Required', 'true')
            ->sendResponse();
        return $this;
    }
    /**
     * Predispatch: should set layout area
     *
     * @return Mage_Checkout_OnepageController
     */
    public function preDispatch()
    {
        parent::preDispatch();
        $this->_preDispatchValidateCustomer();

        $checkoutSessionQuote = Mage::getSingleton('checkout/session')->getQuote();
        if ($checkoutSessionQuote->getIsMultiShipping()) {
            $checkoutSessionQuote->setIsMultiShipping(false);
            $checkoutSessionQuote->removeAllAddresses();
        }

        if (!$this->_canShowForUnregisteredUsers()) {
            $this->norouteAction();
            $this->setFlag('',self::FLAG_NO_DISPATCH,true);
            return;
        }

        return $this;
    }

    /**
     * Checkout page
     */
    public function indexAction()
    {
        if (!Mage::helper('checkout')->canOnepageCheckout()) {
            Mage::getSingleton('checkout/session')->addError($this->__('The onepage checkout is disabled.'));
            $this->_redirect('checkout/cart');
            return;
        }
        $quote = $this->getOnepage()->getQuote();
        if (!$quote->hasItems() || $quote->getHasError()) {
            $this->_redirect('checkout/cart');
            return;
        }
        Mage::app()->getCacheInstance()->cleanType('layout');
        if (!$quote->validateMinimumAmount()) {
            $error = Mage::getStoreConfig('sales/minimum_order/error_message') ?
                Mage::getStoreConfig('sales/minimum_order/error_message') :
                Mage::helper('checkout')->__('Subtotal must exceed minimum order amount');

            Mage::getSingleton('checkout/session')->addError($error);
            $this->_redirect('checkout/cart');
            return;
        }
        Mage::getSingleton('checkout/session')->setCartWasUpdated(false);
        Mage::getSingleton('customer/session')->setBeforeAuthUrl(Mage::getUrl('*/*/*', array('_secure' => true)));



        $this->getOnepage()->initCheckout();
        $this->loadLayout();
        $this->_initLayoutMessages('customer/session');
        $this->getLayout()->getBlock('head')->setTitle($this->__('Checkout'));
        $this->renderLayout();
    }

    /**
     * Check can page show for unregistered users
     *
     * @return boolean
     */
    protected function _canShowForUnregisteredUsers()
    {
        return Mage::getSingleton('customer/session')->isLoggedIn()
        || $this->getRequest()->getActionName() == 'index'
        || Mage::helper('checkout')->isAllowedGuestCheckout($this->getOnepage()->getQuote())
        || !Mage::helper('checkout')->isCustomerMustBeLogged();
    }
    /**
     * Get shipping method step html
     *
     * @return string
     */
    protected function _getShippingMethodsHtml(){
        $layout = $this->getLayout();
        $update = $layout->getUpdate();
        $update->load('checkout_onepage_index');
        $layout->generateXml();
        $layout->generateBlocks();
        $shippingMethods = $layout->getBlock('checkout.onepage.shipping_method');
        $shippingMethods->setTemplate('bluecom/onepage/shipping_method.phtml');
        return $shippingMethods->toHtml();
    }
    /**
     * Get payments method step html
     *
     * @return string
     */
    protected function _getPaymentMethodsHtml($use_method = false, $just_save = false){

        /** UPDATE PAYMENT METHOD **/
        if($use_method && $use_method != -1)
            $apply_method = $use_method;
        else
        {
            /*if($use_method == -1)
                $apply_method = Mage::getStoreConfig(self::XML_PATH_DEFAULT_PAYMENT);
            else
            {
                $apply_method = Mage::helper('opc')->getSelectedPaymentMethod();
                if(empty($apply_method))
                    $apply_method = Mage::getStoreConfig(self::XML_PATH_DEFAULT_PAYMENT);
            }*/
        }

        $_cart = $this->_getCart();
        $_quote = $_cart->getQuote();
        $_quote->getPayment()->setMethod($apply_method);
        $_quote->setTotalsCollectedFlag(false)->collectTotals();
        $_quote->save();

        if($just_save)
            return '';

        $layout = $this->getLayout();
        $update = $layout->getUpdate();
        $update->load('checkout_onepage_paymentmethod');
        $layout->generateXml();
        $layout->generateBlocks();
        $output = $layout->getOutput();
        return $output;
    }
    /**
     * Validate ajax request and redirect on failure
     *
     * @return bool
     */
    protected function _expireAjax(){

        if (!$this->getRequest()->isAjax()){
            $this->_redirectUrl(Mage::getBaseUrl('link', true));
            return;
        }

        if (!$this->getOnepage()->getQuote()->hasItems() || $this->getOnepage()->getQuote()->getHasError() || $this->getOnepage()->getQuote()->getIsMultiShipping()) {
            $this->_ajaxRedirectResponse();
            return true;
        }

        $action = $this->getRequest()->getActionName();
        if (Mage::getSingleton('checkout/session')->getCartWasUpdated(true) && !in_array($action, array('index', 'progress'))) {
            $this->_ajaxRedirectResponse();
            return true;
        }

        return false;
    }
    /**
     * Get review step html
     *
     * @return string
     */
    protected function _getReviewHtml(){

        //clear cache
        Mage::app()->getCacheInstance()->cleanType('layout');

        $layout = $this->getLayout();
        $update = $layout->getUpdate();
        $update->load('checkout_onepage_review');
        $layout->generateXml();
        $layout->generateBlocks();
        $review = $layout->getBlock('root');
        $review->setTemplate('bluecom/onepage/review/info.phtml');

        //clear cache
        Mage::app()->getCacheInstance()->cleanType('layout');
        return $review->toHtml();
    }
    public function saveBillingAction(){

        if ($this->_expireAjax()) {
            return;
        }


        if ($this->getRequest()->isPost()) {

            $data = $this->getRequest()->getPost('billing', array());

            if (!Mage::getSingleton('customer/session')->isLoggedIn()){
                if (isset($data['create_account']) && $data['create_account']==1){
                    $this->getOnepage()->saveCheckoutMethod(Mage_Checkout_Model_Type_Onepage::METHOD_REGISTER);
                }else{
                    $this->getOnepage()->saveCheckoutMethod(Mage_Checkout_Model_Type_Onepage::METHOD_GUEST);
                    unset($data['customer_password']);
                    unset($data['confirm_password']);
                }
            }else{
                $this->getOnepage()->saveCheckoutMethod(Mage_Checkout_Model_Type_Onepage::METHOD_CUSTOMER);
            }



            $this->checkNewslatter();


            $customerAddressId = $this->getRequest()->getPost('billing_address_id', false);

            if (isset($data['email'])) {
                $data['email'] = trim($data['email']);
            }

            // get grand totals before
            $totals_before = $this->_getSession()->getQuote()->getGrandTotal();

            /// get list of available methods before billing changes
            //$methods_before = Mage::helper('opc')->getAvailablePaymentMethods();
            ///////

            $result = $this->getOnepage()->saveBilling($data, $customerAddressId);

            if (!isset($result['error'])) {
                /* check quote for virtual */
                if ($this->getOnepage()->getQuote()->isVirtual()) {
                    $result['isVirtual'] = true;
                };

                //load shipping methods block if shipping as billing;
                $data = $this->getRequest()->getPost('billing', array());
                if (isset($data['use_for_shipping']) && $data['use_for_shipping'] == 1) {
                    $result['shipping'] = $this->_getShippingMethodsHtml();
                }

                /// get list of available methods after discount changes
                $methods_after = Mage::helper('opc')->getAvailablePaymentMethods();
                ///////

                // check if need to reload payment methods
                $use_method = Mage::helper('opc')->checkUpdatedPaymentMethods($methods_before, $methods_after);

                if($use_method != -1)
                {
                    if(empty($use_method))
                        $use_method = -1;

                    // just save new method, (because retuned html is empty)
                    $result['payments'] = $this->_getPaymentMethodsHtml($use_method, true);
                    // and need to send reload method request
                    $result['reload_payments'] = true;
                }
                /////

                // get grand totals after
                $totals_after = $this->_getSession()->getQuote()->getGrandTotal();

                if($totals_before != $totals_after)
                    $result['reload_totals'] = true;

            }else{

                $responseData['error'] = true;
                $responseData['message'] = $result['message'];
            }
            $this->getResponse()->setHeader('Content-type','application/json', true);
            $this->getResponse()->setBody(Mage::helper('core')->jsonEncode($result));
        }
    }
    /**
     * Shipping save action
     */
    public function saveShippingAction(){
        if ($this->_expireAjax()) {
            return;
        }

        //TODO create response if post not exist
        $responseData = array();

        $result = array();

        if ($this->getRequest()->isPost()) {
            // get grand totals after
            $totals_before = $this->_getSession()->getQuote()->getGrandTotal();

            $data = $this->getRequest()->getPost('shipping', array());
            $customerAddressId = $this->getRequest()->getPost('shipping_address_id', false);
            $result = $this->getOnepage()->saveShipping($data, $customerAddressId);

            if (isset($result['error'])){
                $responseData['error'] = true;
                $responseData['message'] = $result['message'];
                $responseData['messageBlock'] = 'shipping';
            }else{

                $responseData['shipping'] = $this->_getShippingMethodsHtml();

                // get grand totals after
                $totals_after = $this->_getSession()->getQuote()->getGrandTotal();

                if($totals_before != $totals_after)
                    $responseData['reload_totals'] = true;
            }
        }

        $this->getResponse()->setHeader('Content-type','application/json', true);
        $this->getResponse()->setBody(Mage::helper('core')->jsonEncode($responseData));

    }
    /**
     * Shipping method save action
     */
    public function saveShippingMethodAction(){
        if ($this->_expireAjax()) {
            return;
        }
        $responseData = array();

        if ($this->getRequest()->isPost()) {

            $this->checkNewslatter();

            $data = $this->getRequest()->getPost('shipping_method', '');
            $result = $this->getOnepage()->saveShippingMethod($data);
            /*
             $result will have erro data if shipping method is empty
            */
            if(!$result) {
                Mage::dispatchEvent('checkout_controller_onepage_save_shipping_method',
                    array('request'=>$this->getRequest(),
                        'quote'=>$this->getOnepage()->getQuote())
                );

                $this->getOnepage()->getQuote()->collectTotals();
                $this->getResponse()->setBody(Mage::helper('core')->jsonEncode($result));

                $responseData['review'] = $this->_getReviewHtml();
                $responseData['grandTotal'] = Mage::helper('opc')->getGrandTotal();
                /*$result['update_section'] = array(
                        'name' => 'payment-method',
                        'html' => $this->_getPaymentMethodsHtml()
                );*/
            }
            $this->getOnepage()->getQuote()->collectTotals()->save();



            $this->getResponse()->setHeader('Content-type','application/json', true);
            $this->getResponse()->setBody(Mage::helper('core')->jsonEncode($responseData));
        }
    }
    public function reviewAction(){
        if ($this->_expireAjax()) {
            return;
        }
        $responseData = array();
        $responseData['review'] = $this->_getReviewHtml();
        $responseData['grandTotal'] = Mage::helper('onecheckout')->getGrandTotal();
        $this->getResponse()->setHeader('Content-type','application/json', true);
        $this->getResponse()->setBody(Mage::helper('core')->jsonEncode($responseData));
    }
    public function paymentsAction(){
        if ($this->_expireAjax()) {
            return;
        }
        $responseData = array();
        $responseData['payments'] = $this->_getPaymentMethodsHtml();
        $this->getResponse()->setHeader('Content-type','application/json', true);
        $this->getResponse()->setBody(Mage::helper('core')->jsonEncode($responseData));
    }


    public function savePaymentAction()
    {
        if ($this->_expireAjax()) {
            return;
        }

        try {
            /*if (!$this->getRequest()->isPost()) {
                $this->_ajaxRedirectResponse();
                return;
            }*/

            // set payment to quote
            $result = array();
            $data = $this->getRequest()->getPost('payment', array());
            $result = $this->getOnepage()->savePayment($data);

            // get section and redirect data
            $redirectUrl = $this->getOnepage()->getQuote()->getPayment()->getCheckoutRedirectUrl();
            if (empty($result['error'])) {
                $this->loadLayout('checkout_onepage_review');
                $result['review'] = $this->_getReviewHtml();
                $result['grandTotal'] = Mage::helper('opc')->getGrandTotal();
            }
            if ($redirectUrl) {
                $result['redirect'] = $redirectUrl;
            }
        } catch (Mage_Payment_Exception $e) {
            if ($e->getFields()) {
                $result['fields'] = $e->getFields();
            }
            $result['error'] = $e->getMessage();
        } catch (Mage_Core_Exception $e) {
            $result['error'] = $e->getMessage();
        } catch (Exception $e) {
            Mage::logException($e);
            $result['error'] = $this->__('Unable to set Payment Method.');
        }

        $this->getResponse()->setHeader('Content-type','application/json', true);
        $this->getResponse()->setBody(Mage::helper('core')->jsonEncode($result));
    }

}