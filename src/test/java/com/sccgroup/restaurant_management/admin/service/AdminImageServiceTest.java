package com.sccgroup.restaurant_management.admin.service;

import com.sccgroup.restaurant_management.common.exception.BusinessException;
import com.sccgroup.restaurant_management.common.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Path;
import static org.junit.jupiter.api.Assertions.*;

class AdminImageServiceTest {
    @TempDir Path directory;
    @Test void storesDecodedImageWithGeneratedNameAndCanReadIt() throws Exception {
        var bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2,2,BufferedImage.TYPE_INT_RGB),"png",bytes);
        var service = new AdminImageService(directory.toString());
        String url = service.store(new MockMultipartFile("file","../../test.png","image/png",bytes.toByteArray()));
        assertTrue(url.matches("/api/customer/media/[a-f0-9-]{36}\\.png"));
        assertEquals(2, ImageIO.read(service.get(url.substring(url.lastIndexOf('/')+1)).toFile()).getWidth());
    }
    @Test void rejectsNonImageEvenIfItClaimsToBePng() {
        var service = new AdminImageService(directory.toString());
        assertThrows(BusinessException.class, () -> service.store(new MockMultipartFile("file","fake.png","image/png","not an image".getBytes())));
    }
    @Test void rejectsLargeUploadAndPathTraversal() {
        var service = new AdminImageService(directory.toString());
        assertThrows(BusinessException.class, () -> service.store(new MockMultipartFile("file","huge.png","image/png",new byte[5*1024*1024+1])));
        assertThrows(ResourceNotFoundException.class, () -> service.get("../secret"));
    }
}
