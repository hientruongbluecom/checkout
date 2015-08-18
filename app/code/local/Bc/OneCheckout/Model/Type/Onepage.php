<?php
class Bc_OneCheckout_Model_Type_Onepage extends Mage_Checkout_Model_Type_Onepage
{
    public function initCheckout()
    {
        $checkout = $this->getCheckout();
        $customerSession = $this->getCustomerSession();

        /**
         * Reset multishipping flag before any manipulations with quote address
         * addAddress method for quote object related on this flag
         */
        if ($this->getQuote()->getIsMultiShipping()) {
            $this->getQuote()->setIsMultiShipping(false);
            $this->getQuote()->save();
        }

        /*
        * want to load the correct customer information by assigning to address
        * instead of just loading from sales/quote_address
        */
        $customer = $customerSession->getCustomer();
        if ($customer) {
            $this->getQuote()->assignCustomer($customer);
        }
        return $this;
    }

    public function saveOnlyOneShippingMethod(){
        $result = null;
        $groupRates = $this->getQuote()->getShippingAddress()->getGroupedAllShippingRates();
        if(count($groupRates) == 1){
            $_sole = count($groupRates) == 1;
            $_rates = $groupRates[key($groupRates)];
            $_sole = $_sole && count($_rates) == 1;
            if ($_sole)
                $result = $this->saveShippingMethod(reset($_rates)->getCode());
        }

        return $result;
    }
}