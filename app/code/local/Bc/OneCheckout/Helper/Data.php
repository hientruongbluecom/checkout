<?php
class Bc_OneCheckout_Helper_Data extends Mage_Core_Helper_Abstract
{
    /**
     * check enable extension Bc_OneCheckout
     * return true/false
     */
    public function isEnable(){
        return Mage::getStoreConfig('onecheckout/general/enabled');
    }
    public function getSubmitUrl()
    {
        return $this->_getUrl('onecheckout/index/savePost');
    }

    public function getSaveStepUrl()
    {
        return $this->_getUrl('onecheckout/index/saveStep');
    }
    // check if user is from persistent cookie
    function isPersistentMember()
    {
        $customerSession = Mage::getSingleton('customer/session');
        if (!$customerSession->isLoggedIn()) {
            $persistent_sess = Mage::helper('persistent/session');
            if($persistent_sess && $persistent_sess->isPersistent())
                return true;
        }
        return false;
    }
    //total cart
    public function getGrandTotal(){
        $quote = Mage::getModel('checkout/session')->getQuote();
        $total = $quote->getGrandTotal();

        return Mage::helper('checkout')->formatPrice($total);
    }


}