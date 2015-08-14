<?php
require_once 'Mage/Checkout/controllers/OnepageController.php';
class Bc_OneCheckout_OnepageController extends Mage_Checkout_OnepageController
{
    /*public function preDispatch()
    {
        die("12345");
    }*/

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
    public function indexAction()
    {
        die('1');
        $scheme = Mage::app ()->getRequest ()->getScheme ();
        if ($scheme == 'http') {
            $secure = false;
        } else {
            $secure = true;
        }
        if(Mage::helper('onecheckout')->isEnable())
        {

            $this->_redirect('bc_checkout',array('_secure'=>$secure));
            return;
        }else{
            parent::indexAction();
        }
    }
}
