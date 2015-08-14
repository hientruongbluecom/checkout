<?php
require_once 'Mage/Checkout/controllers/OnepageController.php';
class Bc_OneCheckout_OnepageController extends Mage_Checkout_OnepageController
{


    public function indexAction()
    {

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
