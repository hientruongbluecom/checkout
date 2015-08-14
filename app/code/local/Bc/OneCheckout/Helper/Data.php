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
}