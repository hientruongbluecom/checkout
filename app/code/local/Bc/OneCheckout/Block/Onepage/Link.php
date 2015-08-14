<?php die('link');
class Bc_OneCheckout_Block_Onepage_Link extends Mage_Core_Block_Template
{
    public function getCheckoutUrl(){
        if (Mage::helper('onecheckout')->isEnable()){
            return $this->getUrl('bc_checkout', array('_secure'=>true));
        }else{
            return $this->getUrl('checkout/onepage', array('_secure'=>true));
        }
    }

    public function isDisabled(){
        return !Mage::getSingleton('checkout/session')->getQuote()->validateMinimumAmount();
    }

    public function isPossibleOnepageCheckout()
    {
        return $this->helper('checkout')->canOnepageCheckout();
    }
}