package com.sccgroup.restaurant_management;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;	

import java.util.TimeZone;

@SpringBootApplication
public class RestaurantManagementApplication {

	public static void main(String[] args) {
		TimeZone.setDefault(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
		SpringApplication.run(RestaurantManagementApplication.class, args);
	}

}