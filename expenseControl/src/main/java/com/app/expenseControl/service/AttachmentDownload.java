package com.app.expenseControl.service;

import com.app.expenseControl.entity.Attachment;

import java.io.InputStream;

public record AttachmentDownload(Attachment attachment, InputStream inputStream) {}
