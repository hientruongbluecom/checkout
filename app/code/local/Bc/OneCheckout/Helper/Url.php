<?php
class Bc_OneCheckout_Helper_Url extends Mage_Checkout_Helper_Url
{
    /**
     * Retrieve checkout url
     *
     * @return string
     */
    public function getCheckoutUrl(){var_dump('h1');
        if (Mage::helper('onecheckout')->isEnable()){
            return $this->_getUrl('bc_checkout', array('_secure'=>true));
        }else{
            return parent::getCheckoutUrl();
        }
    }

    /**
     * One Page (OP) checkout urls
     */
    public function getOPCheckoutUrl(){var_dump('h2');
        if (Mage::helper('onecheckout')->isEnable()){
            return $this->_getUrl('bc_checkout', array('_secure'=>true));
        }else{
            return parent::getOPCheckoutUrl();
        }
    }
}